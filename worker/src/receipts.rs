use worker::*;

/// SQLite reservations only. No email, IP address, inquiry text or token is stored.
#[durable_object]
pub struct ContactReceipts {
    state: State,
}
impl DurableObject for ContactReceipts {
    fn new(state: State, _env: Env) -> Self {
        Self { state }
    }
    async fn fetch(&self, request: Request) -> Result<Response> {
        if request.method() != Method::Post {
            return Response::empty().map(|r| r.with_status(405));
        }
        // Synchronous SQL in one event turn is atomic; no await between check and insert.
        let sql = self.state.storage().sql();
        sql.exec(
            "CREATE TABLE IF NOT EXISTS receipt (id INTEGER PRIMARY KEY CHECK(id=1))",
            None,
        )?;
        #[derive(serde::Deserialize)]
        struct Count {
            n: u32,
        }
        let n: Count = sql.exec("SELECT count(*) AS n FROM receipt", None)?.one()?;
        if n.n != 0 {
            return Response::empty().map(|r| r.with_status(409));
        }
        sql.exec("INSERT INTO receipt VALUES (1)", None)?;
        // Alarm failure leaves a reservation in place and fails closed; never sends mail.
        self.state
            .storage()
            .set_alarm(std::time::Duration::from_secs(86400))
            .await?;
        Response::empty().map(|r| r.with_status(201))
    }
    async fn alarm(&self) -> Result<Response> {
        self.state
            .storage()
            .sql()
            .exec("DELETE FROM receipt", None)?;
        Response::empty()
    }
}
