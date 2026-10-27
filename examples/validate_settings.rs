//! Offline validation with the same parser as production; values are never printed.
use nuxtjp_contact_worker::config::{Variables, parse};
use std::{collections::BTreeMap, error::Error};
fn main() -> Result<(), Box<dyn Error>> {
    let path = std::env::args()
        .nth(1)
        .ok_or("Expected Text-variable JSON file path")?;
    let values: BTreeMap<String, String> = serde_json::from_slice(&std::fs::read(path)?)?;
    let get = |key: &str| {
        values
            .get(key)
            .map(String::as_str)
            .ok_or("Missing variable")
    };
    let settings = parse(Variables {
        accepting: get("CONTACT_ACCEPTING")?,
        sites: get("CONTACT_SITES_JSON")?,
        network: get("CONTACT_NETWORK_JSON")?,
        site_networks: get("CONTACT_SITE_NETWORKS_JSON")?,
    })?;
    println!(
        "Valid runtime configuration: {} sites, global reception {}. No requests or credentials.",
        settings.sites.len(),
        settings.accepting
    );
    Ok(())
}
