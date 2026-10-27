# Activation and security boundary

No live configuration, widget, sender registration, DNS write or mail is created
by source builds. There is no automatic deployment or newly added hosted CI.

Before enabling an origin:

1. Adopt the actual privacy policy, record its stable `urn:coela:legal:...` ID and
   full 40-character lowercase Git commit. Syntax checks do not prove adoption.
2. Choose API hostname ending `/v1/submissions`, exact allowed origins and fixed
   per-site destinations. Keep `workers_dev` and preview URLs disabled.
3. Onboard an Email Service sending subdomain, verify fixed recipients and limit
   the `EMAIL` binding to approved sender/destinations. Preserve the existing
   Microsoft 365 root MX; do not replace it with Email Routing MX.
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
personal data is not captured there. Worker invocation costs/limits and Email
Service availability must be checked in the real account; local tests do not
prove free-plan CPU fit or inbox delivery.

## Local browser acceptance

Run the preview playground on 127.0.0.1:3417, then execute
`node packages/nuxt-contact-form/test/security.browser.mjs`. Stop that server.
Run `CONTACT_FORM_BUILT=1 pnpm exec nuxt dev test/fixtures/contact --host
127.0.0.1 --port 3418`, then execute
`node packages/nuxt-contact-form/test/live.browser.mjs` and `pnpm test:design`.
Tests mock Turnstile and mail/API responses with synthetic values; they never
perform real sending. `pnpm test:worker` runs the compiled Rust Worker plus a
real local SQLite Durable Object with synthetic limiter/email bindings.
The test harness is not referenced by production configuration.

Development graph maintenance uses the already published
`@nuxtjp/dependency-security@0.2.1`. `pnpm security:sync` projects its upstream
backports into native workspace YAML (no patch implementation is independently
maintained here). Refresh/install the lockfile and run `pnpm security:check`.
The node-forge 1.4.0 version-only advisory remains visible because upstream has
no fixed registry version; the actual patched RSA implementation is regression
tested. Do not dismiss the advisory or describe the raw audit as clean.
