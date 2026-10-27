# Activation and security boundary

No live configuration, widget, sender registration, DNS write or mail is created
by source builds. There is no automatic deployment or newly added hosted CI.

Before enabling an origin:

1. Adopt the actual privacy policy, record its stable `urn:coela:legal:...` ID and
   full 40-character lowercase Git commit. Syntax checks do not prove adoption.
2. Choose API hostname ending `/v1/submissions`, exact allowed origins and fixed
   per-site destinations. Keep `workers_dev` and preview URLs disabled.
3. Configure a Microsoft application restricted to the fixed sender mailbox by
   Exchange Application RBAC `Application Mail.Send`. Do not add an independent
   tenant-wide Entra Mail.Send grant: permissions are additive. Review the exact
   production app and scope before provisioning. Existing human delegation is
   not an application grant. Preserve Microsoft 365 MX/SPF/DKIM; this path needs
   no Cloudflare Email Sending/Routing registration or sender DNS.
4. Configure Turnstile hostname(s), action `contact`, server `TURNSTILE_SECRET`
   and client public sitekey. Store random `IP_KEY_SECRET` (at least 32 bytes) in
   Worker secrets only. Never copy secrets into site vars, UI, Git or logs.
5. Add a `LIMITER` rate-limit binding with an account-unique namespace ID and
   reviewed limit/period. This is approximate per location, not a strict global
   send budget. Shared NAT users may share the limit.
6. Review actual IP/CIDR allow/deny values; deny wins. IPv4 and IPv6 clients are
   supported. Mapped IPv4 is normalized before rate keys and CIDR checks; use
   canonical IPv4 CIDRs in config. Country/region/ASN filters are optional and
   use Cloudflare metadata only. This is not universal VPN detection.
7. Exercise denied/allowed traffic, challenge failures, quota/dependency errors,
   actual mailbox delivery and access. Provider acceptance is not delivery.
8. Enable site config and change form mode from preview to live.

No arbitrary recipient, visitor auto-reply, attachments, HTML mail, input
persistence or analytics. Requests are HTTPS JSON POST only (24 KiB, bounded
stream reads/time). No query parameters, cookies or redirects. Origin is an
admission signal, not caller identity; Turnstile and server restrictions remain
required. Deploy only directly at a trusted edge; do not put an untrusted Worker
in front of `CF-Connecting-IP`.

Durable Objects reserve `<siteKey>:<UUIDv4>` atomically before sending. Reservation
metadata only expires by a 24-hour alarm (alarm execution may be delayed); no
inquiry text, address or client IP is stored. Reusing an ID within retention is
rejected. Timeout after sending begins means unknown: do not retry automatically.
A timeout cannot cancel or disprove provider delivery. A new ID can circumvent
at-most-once protection, so it is not a cross-browser global deduplication rule.

Telemetry defaults off. Review platform logs/tails/WAF separately so submitted
personal data is not captured there. Worker invocation costs/limits and Microsoft Graph/Exchange
limits must be checked in the real account; local tests do not
prove free-plan CPU fit or inbox delivery.

## Local browser acceptance

Run the preview playground on 127.0.0.1:3417, then execute
`node packages/nuxt-contact-form/test/security.browser.mjs`. Stop that server.
Run `CONTACT_FORM_BUILT=1 pnpm exec nuxt dev test/fixtures/contact --host
127.0.0.1 --port 3418`, then execute
`node packages/nuxt-contact-form/test/live.browser.mjs` and `pnpm test:design`.
Tests mock Turnstile and mail/API responses with synthetic values; they never
perform real sending. `pnpm test:worker` runs the compiled Rust Worker plus a
real local SQLite Durable Object with synthetic limiter and OAuth/Graph endpoints.
The test harness is not referenced by production configuration.

Development graph maintenance uses the already published
`@nuxtjp/dependency-security@0.2.1`. `pnpm security:sync` projects its upstream
backports into native workspace YAML (no patch implementation is independently
maintained here). Refresh/install the lockfile and run `pnpm security:check`.
The node-forge 1.4.0 version-only advisory remains visible because upstream has
no fixed registry version; the actual patched RSA implementation is regression
tested. Do not dismiss the advisory or describe the raw audit as clean.

## Dashboard-managed reception

In the Worker dashboard, open Settings → Variables and Secrets. Add these as
**Text**, including the JSON strings (do not select JSON binding type), then
Deploy to apply the configuration. Changes do not require rebuilding Rust.

| Variable | Meaning | Initial value |
| --- | --- | --- |
| `CONTACT_ACCEPTING` | Global switch; exactly `true` or `false` | `false` |
| `CONTACT_SITES_JSON` | Site key, exact HTTPS origin, recipient, enabled, pinned policy | Compact `config/sites.example.json` |
| `CONTACT_NETWORK_JSON` | Common IP/CIDR policy | `{}` |
| `CONTACT_SITE_NETWORKS_JSON` | Site key → additional network policy | `{}` |

All four reception variables are required. Malformed configuration rejects submission with
503. Missing `enabled` means false. Enabled entries require an adopted policy's
ID and commit. The server derives the hostname from the exact origin; visitors
cannot choose a recipient or sender. Each variable is bounded to 5120 UTF-8 bytes.
Thirteen sites with full policy references fit when JSON is compacted.

To stop one site, set its `enabled` to false in `CONTACT_SITES_JSON`. To stop all
sites, set `CONTACT_ACCEPTING` to false. Disabled submissions return 403 before
body reads, rate limits, Turnstile calls, reservations or mail sending. This does
not disable website browsing or other enabled sites. In-flight sending cannot
be recalled by changing configuration.

Change `to` only to an approved recipient in the existing Microsoft 365
mail setup. Recipient allowlisting is enforced by these server-owned variables;
Exchange mailbox scope restricts the sender, not recipients. Secrets remain separate secret bindings; never enter them
in these Text variables. One sender can route different sites to different inboxes.
The example has all 13 sites disabled; Coela and HAT are the first pilot sites.

Network objects support `allowedCidrs`, `deniedCidrs`, `allowedCountries`,
`deniedCountries`, `deniedRegions` (`country`, `region`) and `deniedAsns`.
An empty object adds no restriction. Deny wins, and both the common policy and
site-specific policy must permit a submission: site allow rules cannot override
common deny rules. Unknown fields/site keys and invalid CIDRs reject configuration.
The documentation CIDRs in the sample files are examples, not a production VPN list.

Generate initial Text values with `node tools/dashboard-values.mjs`, save them
privately if customizing, then validate with the runtime's own Rust parser:

```sh
node tools/dashboard-values.mjs > /tmp/contact-dashboard.json
cargo run --locked --example validate_settings -- /tmp/contact-dashboard.json
```

`wrangler.jsonc` uses `keep_vars: true` and deliberately defines no `vars`, so
later code deployment preserves dashboard variables. This does not preserve or
provision arbitrary provider bindings. Before live deployment, the production
manifest must include the reviewed Graph variables/secrets, LIMITER/DO bindings and routes;
do not deploy the incomplete candidate manifest over a configured production
Worker. Keep routes, sender permissions and domain records in the deployment
review independently of editable reception policy.

## Optional reply addresses

Set `emailMode` on each `CONTACT_SITES_JSON` entry and the corresponding Nuxt
`contactForm.emailMode` to `required` (default), `optional`, or `disabled`.
The server is authoritative: required rejects a missing/empty address; optional
accepts omission but validates every nonempty address; disabled rejects nonempty
addresses even from a modified client. Unknown modes fail closed.
The UI omits empty addresses from JSON; disabled mode removes the field and its
review row. No substitute or fabricated Reply-To is used when the address is
absent, and no visitor auto-reply is sent. Subject and message remain required.
A client/server mismatch can reject a submission; deploy both settings together.

Describe this as contact-detail-free reporting, not guaranteed anonymity.
Cloudflare/Turnstile still process connection metadata, network restrictions
and HMAC rate limiting remain active, and the text itself may identify people.
The policy acknowledgement is retained even when an address is not collected;
it does not establish the legal basis of every processing activity.

For local acceptance, start the built-module fixture with
`CONTACT_FORM_BUILT=1 CONTACT_TEST_EMAIL_MODE=optional pnpm exec nuxt dev test/fixtures/contact --host 127.0.0.1 --port 3418`, then run
`CONTACT_TEST_EMAIL_MODE=optional node test/email-mode.browser.mjs`.
Stop that server and repeat both commands with `disabled`.
These tests intercept delivery and use synthetic data; no real mail is sent.

## Microsoft Graph machine delivery

Set `GRAPH_TENANT_ID`, `GRAPH_CLIENT_ID` and `GRAPH_SENDER_MAILBOX_ID` as Text
GUID values. Set `GRAPH_CLIENT_SECRET` as a Worker **Secret**, never as Text or
public Nuxt config. These are required only when submitting to an enabled site;
globally/per-site disabled requests are rejected without OAuth or delivery.
Old `CONTACT_MAIL_FROM` and `EMAIL` bindings are unused and must be omitted from
the reviewed production manifest. Sender identity comes only from the mailbox
GUID; there is no client-controlled From address.

Each admitted, nonduplicate submission performs one client-credentials request
at the fixed tenant endpoint and at most one plain-text Graph sendMail request.
There is no token persistence/cache, refresh-token flow, redirect following or
automatic retry. Requests time out after 6 seconds, token body reads after a
further 3 seconds with a 16 KiB limit. Provider error bodies are not read or
reflected. Credentials and token request buffers use best-effort zeroization;
platform-managed JavaScript/HTTP buffers cannot be promised immediate erasure.

Graph 202 is `accepted_by_provider`, not proof of inbox delivery. The own
submission UUID is the receipt; Graph returns no delivery ID in that response.
After reservation, any failure is `outcome_unknown_do_not_resend`, and the same
UUID is blocked without further OAuth/mail calls. Determine the actual outcome
before an operator authorizes a new submission. `saveToSentItems=false` requests
no extra Sent Items copy; verify actual shared-mailbox behavior and retention.

Before production, check the app has no independent unrestricted Entra mail
grants, test allowed sender access and another mailbox's denial, then verify
synthetic Coela/HAT delivery in both inboxes. Application RBAC propagation can
lag its diagnostic cmdlet, so a successful scope test alone is insufficient.
No real credential or production permission is included in this repository.

References: [Graph sendMail](https://learn.microsoft.com/en-us/graph/api/user-sendmail?view=graph-rest-1.0),
[application RBAC](https://learn.microsoft.com/en-us/exchange/permissions-exo/application-rbac),
[client credentials](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-client-creds-grant-flow).
