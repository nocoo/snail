# Snail contributor contract

- Only edit this repository. Do not edit Basalt, OpenCLI, Hexly or reference checkouts.
- Preserve docs/01 through docs/11 as the research baseline. Record implementation changes in new documents.
- Use strict RED–GREEN–REFACTOR: add and run a behavior test that fails, implement, run it successfully, then refactor. Record evidence in GOAL.md; raw artifacts stay ignored.
- Primary Codex is the only writer. Grok/Pi reviews are read-only.
- TypeScript 7.0.2, React, Vite, Biome and public `@nocoo/basalt` APIs. No copied shared-library implementation.
- No authentication bypass in production. Verify Access JWTs at the Worker. Device tokens have separate scopes, expiry, revocation and library binding.
- Never log or commit secrets, private X data or media fixtures. Never transfer X cookies to the cloud. Do not circumvent DRM, private content or browser challenges.
- Use prepared D1 statements, streaming R2 I/O, bounded uploads, exact media host allowlists and a failure-safe publish state machine.
- Run typecheck, lint, unit/HTTP tests, desktop/mobile browser tests, build and Worker dry-run before release. Production requires real D1/R2/Access smoke evidence.
- Commit cohesive working changes; never use `--no-verify`. Release tags must match package.json and point at CI-green main.
- Keep GOAL.md factual: passing local mocks are not production validation. Public `/api/live` must return JSON health, never a login page.
