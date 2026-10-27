use crate::{
    config::Site,
    io::{deadline, reply, verify},
    submission::Submission,
};
use worker::*;
pub async fn deliver(
    site: &Site,
    input: &Submission,
    secret: &str,
    receipts: ObjectNamespace,
    graph: crate::graph::Graph,
) -> Result<Response> {
    let o = Some(site.origin.as_str());
    if !verify(secret, &input.turnstile_token, &site.hostname).await? {
        return reply(403, "verification_failed", o);
    }
    let stub = receipts.get_by_name(&format!("{}:{}", site.site_key, input.submission_id))?;
    let reserved = deadline(
        stub.fetch_with_request(Request::new(
            "https://receipt.internal/reserve",
            Method::Post,
        )?),
        2000,
    )
    .await?;
    if reserved.status_code() == 409 {
        return reply(409, "already_submitted", o);
    }
    if reserved.status_code() != 201 {
        return reply(503, "submission_unavailable", o);
    }
    let text = format!(
        "Receipt: {}\nPolicy: {}\nSubject: {}\n\n{}",
        input.submission_id, input.policy_version, input.subject, input.message
    );
    match graph
        .send(zixcel_microsoft_mail::PlainMail {
            to: &site.to,
            subject: &format!("Website contact: {}", site.site_key),
            text: &text,
            reply_to: if input.email.is_empty() {
                None
            } else {
                Some(&input.email)
            },
        })
        .await
    {
        Ok(()) => reply(202, "accepted_by_provider", o),
        Err(_) => reply(503, "outcome_unknown_do_not_resend", o),
    }
}
