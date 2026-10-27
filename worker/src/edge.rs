use crate::{config, io::reply};
use worker::*;
#[event(fetch)]
async fn main(mut req: Request, env: Env, _ctx: Context) -> Result<Response> {
    // Do not log request bodies, addresses, tokens, secrets or exception messages.
    let mut origin = None;
    match handle(&mut req, &env, &mut origin).await {
        Ok(r) => Ok(r),
        Err(_) => reply(503, "submission_unavailable", origin.as_deref()),
    }
}
async fn handle(req: &mut Request, env: &Env, origin: &mut Option<String>) -> Result<Response> {
    let url = req.url()?;
    if url.scheme() != "https" || url.path() != "/v1/submissions" || url.query().is_some() {
        return reply(404, "not_found", None);
    }
    let list = config::sites(&env.var("SITES_JSON")?.to_string())
        .map_err(|_| Error::RustError("configuration".into()))?;
    let incoming = req.headers().get("origin")?;
    let Some(site) = list.iter().find(|s| Some(&s.origin) == incoming.as_ref()) else {
        return reply(403, "submission_unavailable", None);
    };
    *origin = Some(site.origin.clone());
    let o = Some(site.origin.as_str());
    if req.method() == Method::Options {
        let headers = req
            .headers()
            .get("access-control-request-headers")?
            .unwrap_or_default();
        if req
            .headers()
            .get("access-control-request-method")?
            .as_deref()
            != Some("POST")
            || headers
                .split(',')
                .map(str::trim)
                .filter(|s| !s.is_empty())
                .any(|s| !s.eq_ignore_ascii_case("content-type"))
        {
            return reply(403, "submission_unavailable", o);
        }
        let mut r = Response::empty()?.with_status(204);
        for (k, v) in [
            ("access-control-allow-origin", site.origin.as_str()),
            ("access-control-allow-methods", "POST"),
            ("access-control-allow-headers", "content-type"),
            ("cache-control", "no-store"),
            ("vary", "Origin"),
        ] {
            r.headers_mut().set(k, v)?
        }
        return Ok(r);
    }
    if req.method() != Method::Post {
        let mut r = reply(405, "method_not_allowed", o)?;
        r.headers_mut().set("allow", "POST, OPTIONS")?;
        return Ok(r);
    }
    if !site.enabled {
        return reply(403, "submission_unavailable", o);
    }
    crate::receive::submit(req, env, site).await
}
