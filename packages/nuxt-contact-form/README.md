# @nuxtjp/contact-form — unpublished candidate

Nuxt module with an explicit `<NuxtContactForm />` placement; it never injects
forms on all pages. The standalone repository playground enables **preview mode only** at
`/contact`. The package is private until release acceptance.

Fields: email, subject, message. The privacy acknowledgment is separate from the
legal basis for processing. No attachments, analytics, input persistence or
visitor auto-reply. Input/review strings are escaped by Vue.

Native form fallback is inert (`method=dialog`, unnamed controls). SSR controls
remain disabled until hydration. JavaScript-disabled/failed-hydration operation
is verified with an actual browser, including forcibly enabled native controls.

Live configuration, to be used only after the policy and backend are accepted:

```ts
export default defineNuxtConfig({
 modules: ['@nuxtjp/contact-form'],
 contactForm: {
  mode: 'live',
  endpoint: 'https://YOUR-API/v1/submissions',
  siteKey: 'hat-corporate',
  turnstileSiteKey: 'PUBLIC-TURNSTILE-SITE-KEY',
  policyVersion: 'POLICY-ID@FULL-GIT-COMMIT',
  privacyUrl: '/privacy/'
 }
})
```

```vue
<template><NuxtContactForm /></template>
```

With no live configuration the module defaults to preview and never sends.
Live review loads the official Turnstile widget, using action `contact`. It
requires a current token before allowing the explicit send action. The secret
exists only in the backend. Turnstile processing must be reflected in the policy.

The API request is one bounded JSON POST: cookies omitted, redirects refused,
no referrer, no cache, 20-second timeout and a 4-KiB response cap. There is no
automatic retry. Provider acceptance is not presented as inbox delivery. After
an attempted send the form is locked, including unknown outcomes, to avoid
accidental duplicates. Reloading does not recover an unknown outcome: do not
resend without reconciliation.

Canonical receiving contract and restriction enforcement:
`nuxtjp/contact-form/worker/src`. That adapter accepts only
email/subject/message plus siteKey/submissionId/policyVersion/turnstileToken.
Client-side restrictions are UX only; bypassing this component cannot bypass the
server checks. Restrict the site CSP connect-src/frame-src/script-src to the
chosen API and official Turnstile requirements; native form-action can be none.
No public site, endpoint, DNS record, Turnstile widget or mail binding is enabled
by this source candidate.

Local checks (from the repository root):

```sh
node --test packages/nuxt-contact-form/test/transport.test.mjs
# With the local playground running under the workspace resource limits:
node packages/nuxt-contact-form/test/security.browser.mjs
```

Presentation customization: see `docs/design.md` in nuxtjp/contact-form. No Nuxt UI dependency.

### Contact-detail-free reports

`contactForm.emailMode` accepts `required` (default), `optional`, or `disabled`.
Use `optional` to allow reports without an address or `disabled` to remove the
address field entirely. Match the Worker site's `emailMode`; only the server
can authorize address-free delivery. With no address, there is no Reply-To and
no reply can be promised. The common `privacyUrl` may be an HTTPS link to HAT's
policy, while `policyVersion` pins the adopted ID and full commit for all sites.
This is not a promise of anonymous network access; see operations documentation.
