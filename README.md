# Contact form

A standalone Nuxt form module and Rust/WebAssembly Cloudflare receiver. Candidate
0.1.0: neither package publication nor production deployment has been performed.
No hosted CI is added. Local checks are reproducible with the commands below.

## Responsibilities and dependency review

- `packages/nuxt-contact-form`: UI and bounded browser transport; only `@nuxt/kit`
  is a direct production dependency. Nuxt and Vue are provided by the consumer.
  No Nuxt UI, Tailwind, charting, state library or Cloudflare SDK is required.
- `worker/src`: one Rust crate, with inquiry-specific validation separated into
  modules from the Cloudflare adapter. No separate general-purpose core crate
  is invented without a second consumer. `workers-rs` supplies bindings,
  `ipnet` parses CIDRs, RustCrypto implements HMAC/SHA-256; none is reimplemented.
- Zixcel owns provider **administration**, not this deployed application. Its
  existing mail-core/message crates are SMTP/TLS/MIME-oriented and unpublished;
  importing them would add an incompatible runtime and unrelated dependencies.
  Cloudflare's structured Email Sending binding avoids hand-building MIME.
- Crowsi owns credential custody and host authorization. Its current network
  controller is a deny-by-default **host control dry-run**, not an HTTP admission
  library. It is not copied here. Runtime secrets are Cloudflare bindings;
  deployment credentials remain external and must never enter public UI config.
- Site operators own destinations, policies, allowed origins and IP/CIDR values.
  Shared code does not imply shared controllers or unrestricted cross-site access.

## Form

```ts
export default defineNuxtConfig({
 modules: ['@nuxtjp/contact-form'],
 contactForm: { mode: 'preview' }
})
```

Place `<NuxtContactForm />` explicitly. Preview never sends. See the
[package README](packages/nuxt-contact-form/README.md) for live configuration and
[design customization](docs/design.md) for CSS variables, classes and typed slots.

## Worker

Install Rust with `wasm32-unknown-unknown`, `worker-build` **0.8.7**, Node 24 and
pnpm 10.29.3. `worker-build` generates the minimal JS/Wasm runtime bridge; there
is no handwritten JS server, Node server, SMTP server or administrator API token
inside the deployed application.

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm build:module
pnpm typecheck
pnpm security:check
cargo test --locked
cargo clippy --locked --all-targets -- -D warnings
cargo check --locked --target wasm32-unknown-unknown
pnpm build:worker
pnpm check:worker
pnpm test:worker
```

Build commands should run sequentially under the host's memory/time/task limits.
The release artifact is distinct from `target/` and contains only the generated
Worker code/Wasm and notices. Local build output is ignored by Git.

`wrangler.jsonc` is deliberately disabled: no routes, sender, limiter, secrets or
enabled sites are supplied. The default `SITES_JSON=[]` fails closed. Do not
publish example addresses/CIDRs as live configuration. See
[operations](docs/operations.md) for activation prerequisites and limitations.

Build note: worker-build 0.8.7's optional panic-recovery wrappers fail generation
with the current toolchain (`externref table required for catch wrappers`). The
pinned build uses its official `--no-panic-recovery` switch. A Rust panic fails
that invocation; ordinary admission/provider errors are still explicitly
handled, and unknown delivery is never automatically retried. No custom panic
recovery or runtime is introduced. `--no-opt` skips the optional Binaryen pass;
Cargo release optimization remains enabled.
