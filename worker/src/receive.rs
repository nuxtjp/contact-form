use crate::{
    config::Site,
    io::{bounded, deadline, reply},
    network::Network,
    submission::{MAX_BODY, Submission},
};
use hmac::{Hmac, Mac};
use sha2::Sha256;
use worker::*;
pub async fn submit(
    req: &mut Request,
    env: &Env,
    site: &Site,
    common_network: &Network,
) -> Result<Response> {
    let o = Some(site.origin.as_str());
    let secret = env.secret(&site.turnstile_secret_binding)?.to_string();
    let ip_secret = env.secret("IP_KEY_SECRET")?.to_string();
    if secret.is_empty() || ip_secret.len() < 32 {
        return reply(503, "submission_unavailable", o);
    }
    let limiter = env.rate_limiter("LIMITER")?;
    let receipts = env.durable_object("RECEIPTS_NAMESPACE")?;
    let graph = crate::graph::Graph::from_env(env)?;
    let media = req
        .headers()
        .get("content-type")?
        .unwrap_or_default()
        .to_ascii_lowercase();
    if !matches!(
        media.as_str(),
        "application/json" | "application/json;charset=utf-8" | "application/json; charset=utf-8"
    ) || req.headers().has("content-encoding")?
    {
        return reply(415, "unsupported_media_type", o);
    }
    if let Some(len) = req.headers().get("content-length")? {
        if len.is_empty() || !len.bytes().all(|b| b.is_ascii_digit()) {
            return reply(400, "invalid_submission", o);
        }
        if len.parse::<usize>().unwrap_or(usize::MAX) > MAX_BODY {
            return reply(413, "invalid_submission", o);
        }
    }
    let ip = req.headers().get("cf-connecting-ip")?.unwrap_or_default();
    let Some(cf) = req.cf() else {
        return reply(403, "submission_unavailable", o);
    };
    if ![common_network, &site.network].iter().all(|network| {
        network.allows(
            &ip,
            cf.country().as_deref(),
            cf.region_code().as_deref(),
            cf.asn(),
        )
    }) {
        return reply(403, "submission_unavailable", o);
    }
    let canonical = Network::canonical_ip(&ip).ok_or_else(|| Error::RustError("ip".into()))?;
    let mut mac = Hmac::<Sha256>::new_from_slice(ip_secret.as_bytes())
        .map_err(|_| Error::RustError("key".into()))?;
    mac.update(canonical.as_bytes());
    let hash = mac
        .finalize()
        .into_bytes()
        .iter()
        .map(|b| format!("{b:02x}"))
        .collect::<String>();
    if !deadline(limiter.limit(format!("{}:{hash}", site.site_key)), 2000)
        .await?
        .success
    {
        return reply(429, "rate_limited", o);
    }
    let bytes = match deadline(
        bounded(
            req.inner()
                .body()
                .ok_or_else(|| Error::RustError("missing_body".into()))?,
            MAX_BODY,
        ),
        3000,
    )
    .await
    {
        Ok(b) => b,
        Err(_) => return reply(400, "invalid_submission", o),
    };
    let input = match Submission::parse(&bytes) {
        Ok(s) => s,
        Err(_) => return reply(400, "invalid_submission", o),
    };
    if input.site_key != site.site_key
        || input.policy_version != site.policy_version
        || !site.email_mode.accepts(&input.email)
    {
        return reply(400, "invalid_submission", o);
    }
    crate::delivery::deliver(site, &input, &secret, receipts, graph).await
}
