use futures_util::{
    FutureExt, StreamExt,
    future::{Either, select},
};
use std::{future::Future, time::Duration};
use worker::*;

/// Timing out stops waiting; it cannot prove that a provider did not send mail.
pub async fn deadline<T>(f: impl Future<Output = Result<T>>, ms: u64) -> Result<T> {
    let timer = Delay::from(Duration::from_millis(ms));
    match select(f.boxed_local(), timer.boxed_local()).await {
        Either::Left((value, _)) => value,
        Either::Right(_) => Err(Error::RustError("deadline".into())),
    }
}
pub async fn bounded(raw: web_sys::ReadableStream, max: usize) -> Result<Vec<u8>> {
    use wasm_bindgen::JsCast;
    let mut stream = wasm_streams::ReadableStream::from_raw(raw.unchecked_into())
        .try_into_stream()
        .map_err(|_| Error::RustError("body_locked".into()))?;
    let mut out = Vec::new();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk?
            .dyn_into::<js_sys::Uint8Array>()
            .map_err(|_| Error::RustError("body_type".into()))?;
        let len = chunk.length() as usize;
        if len > max.saturating_sub(out.len()) {
            return Err(Error::RustError("body_limit".into()));
        }
        out.try_reserve(len)
            .map_err(|_| Error::RustError("capacity".into()))?;
        let offset = out.len();
        out.resize(offset + len, 0);
        chunk.copy_to(&mut out[offset..]);
    }
    Ok(out)
}
pub fn reply(status: u16, code: &str, origin: Option<&str>) -> Result<Response> {
    let mut r = Response::from_json(&serde_json::json!({"code":code}))?.with_status(status);
    let h = r.headers_mut();
    for (k, v) in [
        ("cache-control", "no-store"),
        ("referrer-policy", "no-referrer"),
        ("x-content-type-options", "nosniff"),
        (
            "content-security-policy",
            "default-src 'none'; frame-ancestors 'none'",
        ),
        ("vary", "Origin"),
    ] {
        h.set(k, v)?
    }
    if let Some(origin) = origin {
        h.set("access-control-allow-origin", origin)?
    }
    Ok(r)
}
pub async fn verify(secret: &str, token: &str, hostname: &str) -> Result<bool> {
    let mut init = RequestInit::new();
    init.with_method(Method::Post)
        .with_redirect(RequestRedirect::Manual)
        .with_body(Some(
            serde_json::json!({"secret":secret,"response":token})
                .to_string()
                .into(),
        ));
    init.headers.set("content-type", "application/json")?;
    let controller = AbortController::default();
    let signal = controller.signal();
    let r = match deadline(
        Fetch::Request(Request::new_with_init(
            "https://challenges.cloudflare.com/turnstile/v0/siteverify",
            &init,
        )?)
        .send_with_signal(&signal),
        4000,
    )
    .await
    {
        Ok(r) => r,
        Err(e) => {
            controller.abort();
            return Err(e);
        }
    };
    if r.status_code() != 200 {
        controller.abort();
        return Err(Error::RustError("verification_unavailable".into()));
    }
    let raw = match r.body() {
        ResponseBody::Stream(s) => s.clone(),
        _ => {
            controller.abort();
            return Err(Error::RustError("verification_body".into()));
        }
    };
    let bytes = deadline(bounded(raw, 8192), 3000).await;
    controller.abort();
    let v: serde_json::Value = serde_json::from_slice(&bytes?)
        .map_err(|_| Error::RustError("verification_response".into()))?;
    let age = v["challenge_ts"]
        .as_str()
        .map(|s| js_sys::Date::now() - js_sys::Date::parse(s))
        .unwrap_or(f64::NAN);
    Ok(v["success"] == true
        && v["hostname"] == hostname
        && v["action"] == "contact"
        && age.is_finite()
        && (-30_000.0..=300_000.0).contains(&age))
}
