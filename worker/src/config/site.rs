use crate::{
    network::Network,
    submission::{mailbox, policy, site_key},
};
use serde::Deserialize;
use std::collections::{BTreeMap, HashSet};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Entry {
    #[serde(default)]
    email_mode: EmailMode,
    site_key: String,
    origin: String,
    to: String,
    #[serde(default)]
    enabled: bool,
    #[serde(default)]
    policy_version: String,
}
/// The server owns this policy; browser configuration cannot relax it.
#[derive(Clone, Copy, Default, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum EmailMode {
    #[default]
    Required,
    Optional,
    Disabled,
}
impl EmailMode {
    pub fn accepts(self, email: &str) -> bool {
        match self {
            Self::Required => !email.is_empty() && mailbox(email),
            Self::Optional => email.is_empty() || mailbox(email),
            Self::Disabled => email.is_empty(),
        }
    }
}
pub struct Site {
    pub email_mode: EmailMode,
    pub site_key: String,
    pub origin: String,
    pub hostname: String,
    pub to: String,
    pub policy_version: String,
    pub enabled: bool,
    pub network: Network,
}
pub(super) fn parse(
    text: &str,
    mut networks: BTreeMap<String, Network>,
) -> Result<Vec<Site>, &'static str> {
    let entries: Vec<&serde_json::value::RawValue> =
        serde_json::from_str(text).map_err(|_| "invalid_sites")?;
    if entries.len() > 100 {
        return Err("invalid_sites");
    }
    let mut keys = HashSet::new();
    let mut origins = HashSet::new();
    let mut sites = Vec::new();
    for raw in entries {
        if !raw.get().trim_start().starts_with('{') {
            return Err("invalid_site");
        }
        let s: Entry = serde_json::from_str(raw.get()).map_err(|_| "invalid_site")?;
        let u = url::Url::parse(&s.origin).map_err(|_| "invalid_site")?;
        if !site_key(&s.site_key)
            || s.policy_version.len() > 160
            || (s.enabled && !policy(&s.policy_version))
            || !mailbox(&s.to)
            || u.scheme() != "https"
            || u.origin().ascii_serialization() != s.origin
            || !u.username().is_empty()
            || u.password().is_some()
            || !keys.insert(s.site_key.clone())
            || !origins.insert(s.origin.clone())
        {
            return Err("invalid_site");
        }
        let hostname = u.host_str().ok_or("invalid_site")?.to_string();
        let network = networks.remove(&s.site_key).unwrap_or_default();
        if !network.valid() {
            return Err("invalid_network");
        }
        sites.push(Site {
            email_mode: s.email_mode,
            site_key: s.site_key,
            origin: s.origin,
            hostname,
            to: s.to,
            policy_version: s.policy_version,
            enabled: s.enabled,
            network,
        });
    }
    if !networks.is_empty() {
        return Err("unknown_network_site");
    }
    Ok(sites)
}
