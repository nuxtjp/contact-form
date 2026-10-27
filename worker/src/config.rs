//! Dashboard-managed text variables. Secrets and provider binding permissions are separate.
mod site;
use crate::{network::Network, submission::mailbox};
pub use site::Site;
use std::collections::BTreeMap;

pub const MAX_VARIABLE_BYTES: usize = 5120;
pub struct Variables<'a> {
    pub accepting: &'a str,
    pub sites: &'a str,
    pub sender: &'a str,
    pub network: &'a str,
    pub site_networks: &'a str,
}
pub struct Settings {
    pub accepting: bool,
    pub sites: Vec<Site>,
    pub network: Network,
}
pub fn parse(v: Variables<'_>) -> Result<Settings, &'static str> {
    if [v.accepting, v.sites, v.sender, v.network, v.site_networks]
        .iter()
        .any(|s| s.len() > MAX_VARIABLE_BYTES)
    {
        return Err("configuration_too_large");
    }
    let accepting = match v.accepting {
        "true" => true,
        "false" => false,
        _ => return Err("invalid_accepting"),
    };
    fn parse_network(text: &str) -> Result<Network, &'static str> {
        if !text.trim_start().starts_with('{') {
            return Err("invalid_network");
        }
        let n: Network = serde_json::from_str(text).map_err(|_| "invalid_network")?;
        if !n.valid() {
            return Err("invalid_network");
        }
        Ok(n)
    }
    let network = parse_network(v.network)?;
    if !v.site_networks.trim_start().starts_with('{') {
        return Err("invalid_site_networks");
    }
    let raw: BTreeMap<String, &serde_json::value::RawValue> =
        serde_json::from_str(v.site_networks).map_err(|_| "invalid_site_networks")?;
    if raw.len() > 100 {
        return Err("invalid_network");
    }
    let networks = raw
        .into_iter()
        .map(|(k, v)| parse_network(v.get()).map(|n| (k, n)))
        .collect::<Result<BTreeMap<_, _>, _>>()?;
    let sites = site::parse(v.sites, v.sender, networks)?;
    if accepting && sites.iter().any(|s| s.enabled) && !mailbox(v.sender) {
        return Err("invalid_sender");
    }
    Ok(Settings {
        accepting,
        sites,
        network,
    })
}
