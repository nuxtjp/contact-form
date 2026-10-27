use nuxtjp_contact_worker::{config::sites, network::Network, submission::Submission};
use serde_json::{Value, json};
fn network() -> Value {
    json!({"allowedCidrs":[],"deniedCidrs":[],"allowedCountries":[],"deniedCountries":[],"deniedRegions":[],"deniedAsns":[]})
}
fn site() -> Value {
    json!({"siteKey":"fixture","origin":"https://example.com","hostname":"example.com","to":"contact@example.com","from":"forms@notify.example.com","policyVersion":format!("urn:coela:legal:fixture:policy@{}","a".repeat(40)),"enabled":true,"network":network()})
}
#[test]
fn shared_submission_vectors() {
    let rows: Vec<Value> =
        serde_json::from_str(include_str!("../contracts/submission-vectors.json")).unwrap();
    for row in rows {
        assert_eq!(
            Submission::parse(&serde_json::to_vec(&row["value"]).unwrap()).is_ok(),
            row["valid"].as_bool().unwrap(),
            "{}",
            row["name"]
        );
    }
}
#[test]
fn duplicate_json_keys_and_oversized_bytes_fail() {
    let v = include_str!("../contracts/submission-vectors.json");
    let rows: Vec<Value> = serde_json::from_str(v).unwrap();
    let s = serde_json::to_string(&rows[0]["value"]).unwrap();
    assert!(
        Submission::parse(
            s.replace("\"siteKey\":", "\"siteKey\":\"other\",\"siteKey\":")
                .as_bytes()
        )
        .is_err()
    );
    assert!(Submission::parse(&vec![b' '; 24577]).is_err());
}
#[test]
fn configuration_is_exact_pinned_and_bounded() {
    assert!(sites(&json!([site()]).to_string()).is_ok());
    for patch in [
        json!({"policyVersion":"latest"}),
        json!({"origin":"http://example.com"}),
        json!({"origin":"https://example.com/path"}),
        json!({"hostname":"other.example"}),
        json!({"to":"a@example.com,b@example.com"}),
        json!({"enabled":"true"}),
        json!({"unknown":true}),
    ] {
        let mut s = site();
        s.as_object_mut()
            .unwrap()
            .extend(patch.as_object().unwrap().clone());
        assert!(sites(&json!([s]).to_string()).is_err());
    }
    assert!(sites(&json!([site(), site()]).to_string()).is_err());
    assert!(sites("[]").is_err());
    assert!(sites(&" ".repeat(5121)).is_err());
}
#[test]
fn cidr_denial_precedes_allow_and_normalizes_clients() {
    let mut p = network();
    p["allowedCidrs"] = json!(["203.0.113.0/24"]);
    p["deniedCidrs"] = json!(["203.0.113.9/32", "2001:db8::/32"]);
    let n: Network = serde_json::from_value(p).unwrap();
    assert!(n.valid());
    for ip in [
        "203.0.113.9",
        "::ffff:203.0.113.9",
        "2001:db8::1",
        "198.51.100.1",
        "invalid",
    ] {
        assert!(!n.allows(ip, None, None, None));
    }
    assert!(n.allows("203.0.113.10", None, None, None));
    assert_eq!(
        Network::canonical_ip("::ffff:203.0.113.10"),
        Some("203.0.113.10".into())
    );
}
#[test]
fn network_typos_invalid_cidrs_and_mapped_config_rejected() {
    let mut p = network();
    p["deniedIPs"] = json!([]);
    assert!(serde_json::from_value::<Network>(p).is_err());
    let mut p = network();
    p["deniedCidrs"] = json!(["invalid"]);
    assert!(serde_json::from_value::<Network>(p).is_err());
    let mut p = network();
    p["deniedCidrs"] = json!(["::ffff:203.0.113.0/120"]);
    assert!(!serde_json::from_value::<Network>(p).unwrap().valid());
}
#[test]
fn missing_relevant_metadata_fails_closed() {
    for (key, value) in [
        ("deniedCountries", json!(["JP"])),
        ("deniedRegions", json!([{"country":"JP","region":"13"}])),
        ("deniedAsns", json!([64500])),
    ] {
        let mut p = network();
        p[key] = value;
        let n: Network = serde_json::from_value(p).unwrap();
        assert!(!n.allows("203.0.113.9", None, None, None));
        assert!(!n.allows("203.0.113.9", Some("JP"), Some("13"), Some(64500)));
    }
    let n: Network = serde_json::from_value(network()).unwrap();
    assert!(n.allows("2001:db8::1", None, None, None));
}
