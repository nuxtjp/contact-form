//! No redirects or automatic retries; a failed send can still have been accepted remotely.
use crate::io::{bounded, deadline};
use worker::*;
use zixcel_microsoft_mail::{MAX_TOKEN_RESPONSE, Request as MailRequest};
async fn post(request: MailRequest, token: Option<&str>) -> Result<(Response, AbortController)> {
    let mut init = RequestInit::new();
    init.with_method(Method::Post)
        .with_redirect(RequestRedirect::Manual)
        .with_body(Some(request.body.as_str().into()));
    init.headers.set("content-type", request.content_type)?;
    if let Some(token) = token {
        init.headers
            .set("authorization", &format!("Bearer {token}"))?;
    }
    let controller = AbortController::default();
    let result = deadline(
        Fetch::Request(Request::new_with_init(&request.url, &init)?)
            .send_with_signal(&controller.signal()),
        6000,
    )
    .await;
    match result {
        Ok(response) => Ok((response, controller)),
        Err(_) => {
            controller.abort();
            Err(Error::RustError("graph_unavailable".into()))
        }
    }
}
pub async fn token(request: MailRequest) -> Result<Vec<u8>> {
    let (response, controller) = post(request, None).await?;
    if response.status_code() != 200 {
        controller.abort();
        return Err(Error::RustError("graph_authentication_unavailable".into()));
    }
    let body = match response.body() {
        ResponseBody::Stream(s) => s.clone(),
        _ => {
            controller.abort();
            return Err(Error::RustError("graph_token_body".into()));
        }
    };
    let bytes = deadline(bounded(body, MAX_TOKEN_RESPONSE), 3000).await;
    controller.abort();
    bytes
}
pub async fn send(request: MailRequest, token: &str) -> Result<()> {
    let (response, controller) = post(request, Some(token)).await?;
    let accepted = response.status_code() == 202;
    controller.abort();
    if accepted {
        Ok(())
    } else {
        Err(Error::RustError("graph_send_unestablished".into()))
    }
}
