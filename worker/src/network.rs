use ipnet::IpNet;
use serde::Deserialize;
use std::net::IpAddr;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Region {
    pub country: String,
    pub region: String,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Network {
    pub allowed_cidrs: Vec<IpNet>,
    pub denied_cidrs: Vec<IpNet>,
    pub allowed_countries: Vec<String>,
    pub denied_countries: Vec<String>,
    pub denied_regions: Vec<Region>,
    pub denied_asns: Vec<u32>,
}
fn country(s: &str) -> bool {
    s.len() == 2 && s.bytes().all(|b| b.is_ascii_uppercase())
}
impl Network {
    pub fn valid(&self) -> bool {
        self.allowed_countries
            .iter()
            .chain(&self.denied_countries)
            .all(|s| country(s))
            && self.denied_regions.iter().all(|r| {
                country(&r.country)
                    && !r.region.is_empty()
                    && r.region.len() <= 8
                    && r.region
                        .bytes()
                        .all(|b| b.is_ascii_alphanumeric() || b == b'-')
            })
            && !self.denied_asns.contains(&0)
            && self
                .allowed_cidrs
                .iter()
                .chain(&self.denied_cidrs)
                .all(|n| !matches!(n, IpNet::V6(v) if v.addr().to_ipv4_mapped().is_some()))
    }
    pub fn allows(
        &self,
        ip: &str,
        c: Option<&str>,
        region: Option<&str>,
        asn: Option<u32>,
    ) -> bool {
        let Ok(mut ip) = ip.parse::<IpAddr>() else {
            return false;
        };
        if let IpAddr::V6(v) = ip
            && let Some(v4) = v.to_ipv4_mapped()
        {
            ip = IpAddr::V4(v4)
        }
        let geo = !self.allowed_countries.is_empty()
            || !self.denied_countries.is_empty()
            || !self.denied_regions.is_empty();
        if geo && !c.is_some_and(country) {
            return false;
        }
        if !self.allowed_countries.is_empty()
            && !self.allowed_countries.iter().any(|x| Some(x.as_str()) == c)
        {
            return false;
        }
        !self.denied_countries.iter().any(|x| Some(x.as_str()) == c)
            && !self.denied_regions.iter().any(|r| {
                Some(r.country.as_str()) == c
                    && (region.is_none() || Some(r.region.as_str()) == region)
            })
            && (self.denied_asns.is_empty()
                || asn.is_some_and(|n| n != 0 && !self.denied_asns.contains(&n)))
            && !self.denied_cidrs.iter().any(|n| n.contains(&ip))
            && (self.allowed_cidrs.is_empty() || self.allowed_cidrs.iter().any(|n| n.contains(&ip)))
    }
    pub fn canonical_ip(ip: &str) -> Option<String> {
        let ip: IpAddr = ip.parse().ok()?;
        Some(
            match ip {
                IpAddr::V6(v) => v.to_ipv4_mapped().map(IpAddr::V4).unwrap_or(ip),
                _ => ip,
            }
            .to_string(),
        )
    }
}
