use crate::{
    network::Network,
    submission::{mailbox, policy, site_key},
};
use serde::Deserialize;
use std::collections::HashSet;
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Site {
    pub site_key: String,
    pub origin: String,
    pub hostname: String,
    pub to: String,
    pub from: String,
    pub policy_version: String,
    pub enabled: bool,
    pub network: Network,
}
pub fn sites(text: &str) -> Result<Vec<Site>, &'static str> {
    if text.len() > 5120 {
        return Err("configuration_too_large");
    }
    let list: Vec<Site> = serde_json::from_str(text).map_err(|_| "invalid_sites")?;
    if list.is_empty() || list.len() > 100 {
        return Err("invalid_sites");
    }
    let mut keys = HashSet::new();
    let mut origins = HashSet::new();
    for s in &list {
        let u = url::Url::parse(&s.origin).map_err(|_| "invalid_site")?;
        if !site_key(&s.site_key)
            || s.policy_version.is_empty()
            || s.policy_version.len() > 160
            || (s.enabled && !policy(&s.policy_version))
            || !mailbox(&s.to)
            || !mailbox(&s.from)
            || u.scheme() != "https"
            || u.origin().ascii_serialization() != s.origin
            || u.host_str() != Some(&s.hostname)
            || !u.username().is_empty()
            || u.password().is_some()
            || !keys.insert(&s.site_key)
            || !origins.insert(&s.origin)
            || !s.network.valid()
        {
            return Err("invalid_site");
        }
    }
    Ok(list)
}
