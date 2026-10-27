use nuxtjp_contact_worker::config::{Variables, parse};
use serde_json::{Value, json};
fn entries() -> Value {
    json!([{"siteKey":"first","origin":"https://one.example.com","to":"contact@one.example.com","enabled":true,"policyVersion":format!("urn:coela:legal:fixture:policy@{}","a".repeat(40))},{"siteKey":"second","origin":"https://two.example.com","to":"contact@two.example.com"}])
}
#[test]
fn per_site_disabled_default_and_sender_are_not_client_controlled() {
    let rows = entries().to_string();
    let c = parse(Variables {
        accepting: "true",
        sites: &rows,
        sender: "forms@notify.example.com",
        network: "{}",
        site_networks: "{}",
    })
    .unwrap();
    assert!(c.accepting);
    assert!(c.sites[0].enabled);
    assert!(!c.sites[1].enabled);
    assert_eq!(c.sites[1].hostname, "two.example.com");
    assert_eq!(c.sites[0].from, "forms@notify.example.com");
    assert_ne!(c.sites[0].to, c.sites[1].to);
}
#[test]
fn emergency_stop_and_bad_flags_fail_closed() {
    let rows = entries().to_string();
    let c = parse(Variables {
        accepting: "false",
        sites: &rows,
        sender: "",
        network: "{}",
        site_networks: "{}",
    })
    .unwrap();
    assert!(!c.accepting);
    for flag in ["TRUE", "1", "", " false "] {
        assert!(
            parse(Variables {
                accepting: flag,
                sites: &rows,
                sender: "forms@notify.example.com",
                network: "{}",
                site_networks: "{}"
            })
            .is_err()
        )
    }
    assert!(
        parse(Variables {
            accepting: "true",
            sites: &rows,
            sender: "",
            network: "{}",
            site_networks: "{}"
        })
        .is_err()
    );
}
#[test]
fn global_deny_is_not_overridden_by_site_allow() {
    let rows = entries().to_string();
    let c = parse(Variables {
        accepting: "true",
        sites: &rows,
        sender: "forms@notify.example.com",
        network: r#"{"deniedCidrs":["203.0.113.0/24"]}"#,
        site_networks: r#"{"first":{"allowedCidrs":["203.0.113.9/32"]}}"#,
    })
    .unwrap();
    assert!(c.sites[0].network.allows("203.0.113.9", None, None, None));
    assert!(!c.network.allows("203.0.113.9", None, None, None));
}
#[test]
fn network_typos_unknown_sites_and_invalid_types_reject_configuration() {
    let rows = entries().to_string();
    for (global, per_site) in [
        (r#"{"deniedCidr":["203.0.113.0/24"]}"#, "{}"),
        ("{}", r#"{"typo":{"deniedCidrs":["203.0.113.0/24"]}}"#),
        ("{}", r#"{"first":{"deniedCidrs":["invalid"]}}"#),
        ("[]", "{}"),
        ("{}", "[]"),
        ("{}", r#"{"first":[]}"#),
    ] {
        assert!(
            parse(Variables {
                accepting: "true",
                sites: &rows,
                sender: "forms@notify.example.com",
                network: global,
                site_networks: per_site
            })
            .is_err()
        );
    }
}
#[test]
fn thirteen_sites_fit_each_variable_even_with_policy_commits() {
    let mut rows: Vec<Value> =
        serde_json::from_str(include_str!("../config/sites.example.json")).unwrap();
    assert_eq!(rows.len(), 13);
    for row in &mut rows {
        row["enabled"] = json!(true);
        row["policyVersion"] = json!(format!(
            "urn:coela:legal:organization:site-operator:privacy-policy@{}",
            "a".repeat(40)
        ))
    }
    let text = serde_json::to_string(&rows).unwrap();
    assert!(text.len() <= 5120);
    assert_eq!(
        parse(Variables {
            accepting: "true",
            sites: &text,
            sender: "forms@notify.example.com",
            network: "{}",
            site_networks: "{}"
        })
        .unwrap()
        .sites
        .len(),
        13
    );
}
