use serde::Deserialize;

pub const MAX_BODY: usize = 24_576;
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Submission {
    pub site_key: String,
    #[serde(default)]
    pub email: String,
    pub subject: String,
    pub message: String,
    pub turnstile_token: String,
    pub submission_id: String,
    pub policy_version: String,
}
pub fn site_key(s: &str) -> bool {
    !s.is_empty()
        && s.len() <= 64
        && s.as_bytes()[0].is_ascii_alphanumeric()
        && s.bytes()
            .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-')
}
pub fn policy(s: &str) -> bool {
    let Some((id, commit)) = s.split_once('@') else {
        return false;
    };
    s.len() <= 160
        && id.starts_with("urn:coela:legal:")
        && id.len() > 16
        && id
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b":.-".contains(&b))
        && commit.len() == 40
        && commit
            .bytes()
            .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
}
pub fn mailbox(s: &str) -> bool {
    let Some((local, domain)) = s.split_once('@') else {
        return false;
    };
    if s.len() > 254 || local.is_empty() || local.len() > 64 || !domain.contains('.') {
        return false;
    }
    let atom = |b: u8| b.is_ascii_alphanumeric() || b"!#$%&'*+/=?^_`{|}~-".contains(&b);
    if !local
        .split('.')
        .all(|part| !part.is_empty() && part.bytes().all(atom))
    {
        return false;
    }
    let labels: Vec<_> = domain.split('.').collect();
    let tld = labels.last().unwrap_or(&"");
    tld.len() >= 2
        && tld.len() <= 63
        && tld.bytes().all(|b| b.is_ascii_alphabetic())
        && labels.iter().all(|p| {
            !p.is_empty()
                && p.len() <= 63
                && p.as_bytes()[0].is_ascii_alphanumeric()
                && p.as_bytes()[p.len() - 1].is_ascii_alphanumeric()
                && p.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'-')
        })
}
fn uuid(s: &str) -> bool {
    s.len() == 36
        && s.bytes().enumerate().all(|(i, b)| match i {
            8 | 13 | 18 | 23 => b == b'-',
            14 => b == b'4',
            19 => b"89abAB".contains(&b),
            _ => b.is_ascii_hexdigit(),
        })
}
impl Submission {
    pub fn parse(bytes: &[u8]) -> Result<Self, &'static str> {
        if bytes.len() > MAX_BODY || bytes.iter().find(|b| !b.is_ascii_whitespace()) != Some(&b'{')
        {
            return Err("invalid_submission");
        }
        let v: Self = serde_json::from_slice(bytes).map_err(|_| "invalid_submission")?;
        if !site_key(&v.site_key)
            || (!v.email.is_empty() && !mailbox(&v.email))
            || !uuid(&v.submission_id)
            || !policy(&v.policy_version)
            || v.turnstile_token.is_empty()
            || v.turnstile_token.encode_utf16().count() > 2048
            || v.subject.trim().is_empty()
            || v.subject.starts_with(char::is_whitespace)
            || v.subject.encode_utf16().count() > 150
            || v.subject.chars().any(char::is_control)
            || v.message.trim().is_empty()
            || v.message.encode_utf16().count() > 5000
            || v.message
                .chars()
                .any(|c| c.is_control() && !matches!(c, '\t' | '\r' | '\n'))
        {
            return Err("invalid_submission");
        }
        Ok(v)
    }
}
