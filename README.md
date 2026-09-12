<picture>
  <source media="(prefers-color-scheme: dark)" srcset="public/brand/lockup-dark.svg">
  <img src="public/brand/lockup-light.svg" width="227" height="96" alt="Snail">
</picture>

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

Snail brand **1.0.0** is adopted from Hexly commit `352eb2652d4e11c876ef84152fc8e02f8d5ed331`. Navigation uses the actual application theme; browser icons retain the original SVG/ICO. All 21 selected files are byte-for-byte verified with `bun run brand:check`.

[Brand provenance](public/brand/provenance.json) · [Usage guide](public/brand/guide.md) · [Adoption record](docs/15-品牌采用与来源.md). Original geometry/code: MIT; Space Grotesk outlines: SIL OFL 1.1. The two license notices ship with the assets. Application and brand versions are independent.
