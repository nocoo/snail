# Snail

A private video collection, organization and playback library. Vite + React, TypeScript 7, Basalt, Cloudflare Worker, D1, private R2 and Cloudflare Access.

- Production: https://snail.hexly.ai
- Source: https://github.com/nocoo/snail (public, MIT)
- Release under development: **0.1.0**. Deployment is only complete after the gates in [GOAL.md](GOAL.md) pass.
- Research: the eleven numbered Chinese documents in [docs](docs/01-研究结论与范围.md) are preserved as the pre-implementation record.

The local OpenCLI Connector reuses the user's browser session locally. X cookies, passwords and authorization headers never enter Snail's cloud API or storage. Import only media you own or are authorized to retain. A downloadable media representation is not proof of copyright permission or the uploader's original master.

## Development

```sh
bun install --frozen-lockfile
bun run types
bun run test
bun run build
```

See [GOAL.md](GOAL.md) for implementation evidence and remaining release gates. No production data, test videos, credentials or browser profiles belong in this repository.

## Brand

The provisional brand slot will be replaced by the independently published Hexly Snail assets after their public URLs, pinned revision, SHA-256 checksums and license are supplied.
