use nuxtjp_contact_worker::config::{Variables, parse};
use serde_json::{Value, json};
fn entries() -> Value {
    json!([{"siteKey":"first","origin":"https://one.example.com","to":"contact@one.example.com","enabled":true,"policyVersion":format!("urn:coela:legal:fixture:policy@{}","a".repeat(40))},{"siteKey":"second","origin":"https://two.example.com","to":"contact@two.example.com"}])
}
#[test]
fn per_site_disabled_default_and_recipients_are_server_controlled() {
    let rows = entries().to_string();
    let c = parse(Variables {
        accepting: "true",
        sites: &rows,
        network: "{}",
        site_networks: "{}",
    })
    .unwrap();
    assert!(c.accepting);
    assert!(c.sites[0].enabled);
    assert!(!c.sites[1].enabled);
    assert_eq!(c.sites[1].hostname, "two.example.com");
    assert_ne!(c.sites[0].to, c.sites[1].to);
}
#[test]
fn emergency_stop_and_bad_flags_fail_closed() {
    let rows = entries().to_string();
    let c = parse(Variables {
        accepting: "false",
        sites: &rows,
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
                network: "{}",
                site_networks: "{}"
            })
            .is_err()
        )
    }
    let mut injected = entries();
    injected[0]["from"] = json!("attacker@example.com");
    assert!(
        parse(Variables {
            accepting: "true",
            sites: &injected.to_string(),
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
        row["turnstileSecretBinding"] = json!("TURNSTILE_SECRET_EXTENDED");
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
            network: "{}",
            site_networks: "{}"
        })
        .unwrap()
        .sites
        .len(),
        13
    );
}

#[test]
fn email_modes_are_server_owned_and_default_to_required() {
    for (mode, empty, provided) in [
        (None, false, true),
        (Some("required"), false, true),
        (Some("optional"), true, true),
        (Some("disabled"), true, false),
    ] {
        let mut rows = entries();
        if let Some(mode) = mode {
            rows[0]["emailMode"] = json!(mode);
        }
        let text = rows.to_string();
        let c = parse(Variables {
            accepting: "true",
            sites: &text,
            network: "{}",
            site_networks: "{}",
        })
        .unwrap();
        assert_eq!(c.sites[0].email_mode.accepts(""), empty);
        assert_eq!(
            c.sites[0].email_mode.accepts("person@example.com"),
            provided
        );
        assert!(
            !c.sites[0]
                .email_mode
                .accepts("bad\r\nBcc: victim@example.com")
        );
    }
    let mut rows = entries();
    rows[0]["emailMode"] = json!("anonymous");
    assert!(
        parse(Variables {
            accepting: "true",
            sites: &rows.to_string(),
            network: "{}",
            site_networks: "{}"
        })
        .is_err()
    );
}

#[test]
fn turnstile_binding_is_server_owned_bounded_and_backwards_compatible() {
    for (value, accepted) in [
        (None, true),
        (Some("TURNSTILE_SECRET_EXTENDED"), true),
        (Some("GRAPH_CLIENT_SECRET"), false),
        (Some("IP_KEY_SECRET"), false),
        (Some("TURNSTILE_SECRET_"), false),
        (Some("TURNSTILE_SECRET_lowercase"), false),
        (Some("TURNSTILE_SECRET_../OTHER"), false),
    ] {
        let mut rows = entries();
        if let Some(value) = value {
            rows[0]["turnstileSecretBinding"] = json!(value);
        }
        let text = rows.to_string();
        let result = parse(Variables {
            accepting: "true",
            sites: &text,
            network: "{}",
            site_networks: "{}",
        });
        assert_eq!(result.is_ok(), accepted);
        if let Ok(settings) = result {
            assert_eq!(
                settings.sites[0].turnstile_secret_binding,
                value.unwrap_or("TURNSTILE_SECRET")
            );
        }
    }
}
