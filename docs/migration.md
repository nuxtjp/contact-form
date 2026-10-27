# Ownership migration

The original unpublished form was introduced in nuxtjp/nuxtjp-ui PR #71,
source d745370721a849b8f44a2a5a5883d67950697c73, at
`packages/nuxt-contact-form`. The original JavaScript Worker was introduced in
zixcel/zixcel-cloudflare PR #34, source
18dcedd5dab75452fce6a39a05cb0331deef0c22, at `packages/contact-worker`.

This repository is the canonical source for both sides of the contact API. The
Nuxt package name remains `@nuxtjp/contact-form`; it has never been published.
No consumer sites or live Worker require upgrade because none was enabled.
The old preview/fixture is moved here, not retained through a cross-repository
source link. Provider administration packages are unaffected.

The JavaScript server is replaced, not kept as an alternative deployed runtime.
Its observable security cases are retained as Rust validation vectors and actual
Rust/Wasm/workerd acceptance tests. Rust normalizes IP addresses before HMAC
rate keys and rejects duplicate JSON keys. The browser transport, challenge
lifecycle, private fallback and bounded responses retain their prior regression
coverage. Customization adds safe text/classes/slots without a UI framework.

No Crowsi custody implementation or Zixcel SMTP/administration implementation is
copied. Review rationale is in the root README. No new provider permission,
secret, account, policy adoption, DNS, live deployment or real sending is part
of this source migration.
