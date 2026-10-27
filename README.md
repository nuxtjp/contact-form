# Contact form

A standalone Nuxt form module and Rust/WebAssembly Cloudflare receiver. Nuxt module
0.1.0 is published; the Graph-based Worker 0.3.0 is a source candidate and has not
been deployed to production.
No hosted CI is added. Local checks are reproducible with the commands below.

## Responsibilities and dependency review

- `packages/nuxt-contact-form`: UI and bounded browser transport; only `@nuxt/kit`
  is a direct production dependency. Nuxt and Vue are provided by the consumer.
  No Nuxt UI, Tailwind, charting, state library or Cloudflare SDK is required.
- `worker/src`: one Rust crate, with inquiry-specific validation separated into
  modules from the Cloudflare adapter. No separate general-purpose core crate
  is invented without a second consumer. `workers-rs` supplies bindings,
  `ipnet` parses CIDRs, RustCrypto implements HMAC/SHA-256; none is reimplemented.
- Zixcel owns Microsoft protocol and provider administration, not this deployed
  application. The portable `zixcel-microsoft-mail` crate is pinned to an immutable
  Git revision; it builds bounded OAuth/Graph messages without importing the
  native administration CLI, SMTP/TLS/MIME stack or credential store. The Worker
  owns HTTPS execution, admission, server-managed recipients and failure handling.
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

`wrangler.jsonc` is deliberately disabled: no routes, Graph identity, limiter, secrets or
enabled sites are supplied. Missing dashboard variables fail closed. `keep_vars` preserves dashboard Text
variables on code deployments; no defaults in the manifest overwrite them. Do not
publish example addresses/CIDRs as live configuration. See
[operations](docs/operations.md) for activation prerequisites and limitations.

Build note: worker-build 0.8.7's optional panic-recovery wrappers fail generation
with the current toolchain (`externref table required for catch wrappers`). The
pinned build uses its official `--no-panic-recovery` switch. A Rust panic fails
that invocation; ordinary admission/provider errors are still explicitly
handled, and unknown delivery is never automatically retried. No custom panic
recovery or runtime is introduced. `--no-opt` skips the optional Binaryen pass;
Cargo release optimization remains enabled.
