//! Application credentials stay in Worker secrets; visitor data is never sent to OAuth.
use worker::*;
use zeroize::Zeroizing;
use zixcel_microsoft_mail::{Application, PlainMail, parse_token};
pub struct Graph {
    app: Application,
    credential: Zeroizing<String>,
}
impl Graph {
    pub fn from_env(env: &Env) -> Result<Self> {
        let var = |name| env.var(name).map(|v| v.to_string());
        let app = Application::new(
            &var("GRAPH_TENANT_ID")?,
            &var("GRAPH_CLIENT_ID")?,
            &var("GRAPH_SENDER_MAILBOX_ID")?,
        )
        .map_err(|_| Error::RustError("graph_configuration".into()))?;
        let credential = Zeroizing::new(env.secret("GRAPH_CLIENT_SECRET")?.to_string());
        // Validate before consuming the visitor's challenge or reserving their submission ID.
        app.client_secret_request(&credential)
            .map_err(|_| Error::RustError("graph_configuration".into()))?;
        Ok(Self { app, credential })
    }
    pub async fn send(self, mail: PlainMail<'_>) -> Result<()> {
        let request = self
            .app
            .client_secret_request(&self.credential)
            .map_err(|_| Error::RustError("graph_configuration".into()))?;
        // One fresh token request per admitted submission. No persisted token or refresh credential.
        let bytes = Zeroizing::new(crate::graph_http::token(request).await?);
        let token = parse_token(200, &bytes)
            .map_err(|_| Error::RustError("graph_authentication_unavailable".into()))?;
        let request = self
            .app
            .send_request(mail)
            .map_err(|_| Error::RustError("graph_message".into()))?;
        crate::graph_http::send(request, token.secret()).await
    }
}
