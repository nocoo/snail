# Snail — brand assets v1.0.0

Snail is a private library for collecting, organizing and playing videos. Its
identity is a quiet coiled shell, a low carrying line and one terracotta point.
The shell suggests a collection kept close; the forward line and point suggest
returning to a chosen film. The point is part of the mark, not a live status light.

This original vector identity was commissioned by the owner on 2026-09-12 and
designed in hexly.ai. It follows the actual Hexly paper, ink, terracotta and
Space Grotesk language. No Eagle artwork, third-party icon, traced image or
image-model output was used. The earlier sketch is preserved in the source
archive; the selected geometry below is the published master.

- Project and interactive archive: https://hexly.ai/projects/snail#brand
- Standalone specimens: https://hexly.ai/brands/snail/v1.0.0/review.html
- Asset base: https://hexly.ai/brands/snail/v1.0.0/
- Checksums and exact byte sizes: `manifest.json` beside these assets.
- Source archive: `artwork/brands/snail/v1.0.0/` in `nocoo/hexly.ai`.
- Snail application: https://github.com/nocoo/snail; intended site https://snail.hexly.ai.

Brand publication does not establish adoption or release of the application.
The Snail team owns its implementation, integration, product version and
deployment. At the initial brand handoff, the application is in development
toward v0.1.0. These brand assets use the independent version 1.0.0.

## Asset roles

| Use | File | Contract |
| --- | --- | --- |
| Header, sidebar, navigation | `mark-light.svg` / `mark-dark.svg` | Transparent; choose the actual app theme, without a tile or CSS crop |
| Standalone mark with system theme | `mark.svg` | SVG media query; use explicit variants when app and system themes differ |
| Text-only brand | `wordmark-light.svg` / `wordmark-dark.svg` | Real Space Grotesk 600 outlines; no font dependency |
| Header, README, brand title | `lockup-light.svg` / `lockup-dark.svg` | Fixed symbol/wordmark spacing; preserve the complete viewBox |
| App tile, large presentation | `icon-light.svg` / `icon-dark.svg` | Square master with Hexly paper; platform applies its own mask |
| Browser tab | `favicon.svg` | Transparent, follows system light/dark, exact master geometry |
| Older browser fallback | `favicon.ico` | True ICO; 16, 32, 48, 64, 128 and 256px transparent entries, terracotta monochrome for both tab themes |
| Raster application mark | `logo-light.png` / `logo-dark.png` | 1024px transparent rasterizations from the SVG; not separate artwork |
| Exact small raster marks | `mark-{light,dark}-{16,24,32,48,64,128,256}.png` | Whole-canvas rasterizations with alpha; no tile or crop |
| Apple touch | `apple-touch-icon.png` | Opaque 180px paper tile; iOS applies rounded corners |
| Web app icons | `icon-192.png`, `icon-light-512.png`, `icon-dark-512.png` | Declare `purpose: "any"`, not `maskable` |
| One-color reproduction | `mark-mono.svg` | Ink-only master; keep the separated point and original proportions |

Keep transparent marks separate from presentation tiles. Do not round or mask
the transparent mark, redraw its coil, move the point, add extra dots, stretch
the wordmark, or substitute a similar font. The public archive preserves the
original light master separately at `/logos/originals/snail-v1-0-0.svg`.

## Color and type

| Role | Light | Dark |
| --- | --- | --- |
| Paper | `#f0f0e9` | `#1e2824` |
| Ink | `#30372e` | `#e6e9dc` |
| Terracotta point | `#bf5c3c` | `#e79670` |
| Fine rules | `#d4d8cb` | `#3d4940` |
| Elevated surface | `#f8f8f2` | `#27332c` |

These are unchanged Hexly tokens from `src/styles/base.css` at
`a55baf21a2f0842c0580098e54d4479e41847593`; `tokens.json` records the evidence.
Use ink for small text. Terracotta is a sparse identity accent, not the default
body-text color. Do not put the light ink mark on a dark surface. The fallback
ICO uses terracotta for visibility on both light and dark tabs.

The wordmark uses the same Space Grotesk weight 600 and -1/23 em tracking as
the Hexly header. Every glyph is outlined without geometric alteration. The
bundled WOFF2 is the site's unmodified `@fontsource-variable/space-grotesk@5.3.0`
font, SHA-256 `0640890476fc1198ab4de571fb658de443c4d85b66466ec09534a8737ab1ce9d`.

## Clear space and scale

Use one point diameter as the unit: **24 units in the 256-unit mark viewBox**.
Keep at least one unit clear around the visible artwork. The delivered SVG
canvas includes that minimum; additional surrounding space is welcome. Retain
the complete viewBox and scale uniformly. Never crop the title's vertical bounds.

- Transparent mark: **16px minimum**, 24px preferred for navigation.
- Wordmark: **72px minimum width**.
- Symbol plus wordmark: **160px minimum width**.
- At 16px the silhouette and separated point carry recognition. The smallest
  turn of the coil softens; use the actual 16px specimen when reviewing a tab.

Use an accessible text label on a logo link. An image beside the written product
name can use empty alt text; a standalone image uses `alt="Snail"`. Do not use
the red point alone to communicate service health. Static logo display is the
default and works with reduced motion without another animation layer.

## Integration

Download the selected files from the public base above; verify each SHA-256
against the manifest **from the published Hexly Git commit**. Vendor the bytes
into Snail, keep a copy of the manifest and license files, and record both the
Hexly commit and brand version in Snail's provenance. Do not depend on a mutable
`main` URL or runtime fetching of the entire brand kit. Snail owns these writes.

```html
<link rel="icon" href="/brand/favicon.svg" type="image/svg+xml">
<link rel="alternate icon" href="/brand/favicon.ico" sizes="any">
<link rel="apple-touch-icon" href="/brand/apple-touch-icon.png">
<!-- Choose the variant from the application's theme, not just the OS theme. -->
<img src="/brand/lockup-light.svg" alt="Snail" width="227" height="96">
```

For a dark app theme, use `lockup-dark.svg` with the same dimensions. The complete
vector lockup is 454 × 192, and the standalone mark is 256 × 256. Files in this
versioned public directory are immutable after publication. A geometry, palette,
wordmark or export-byte change requires a new brand version and directory.

The existing site share card is https://hexly.ai/og/snail.jpg. The source product
may use it through the standard Hexly share metadata integration; it is separate
from the immutable logo assets.

## License and provenance

- Original Snail geometry, specimens and export code: repository MIT license,
  copyright 2026 Zheng Li; see `license.txt`.
- Space Grotesk: original copyright notices and SIL Open Font License 1.1 in
  `space-grotesk-ofl.txt`. Preserve those notices if distributing the font.
- Hexly endorsement geometry: exact existing `BrandMark` paths, sourced from
  `src/components/Icon.tsx` and the shared Video Kit brand record. It is supplied
  separately as `hexly-mark.svg`; do not confuse it with the Snail product mark.
- No externally supplied images, trademark artwork or raster tracing. No claim
  is made that a font license transfers trademark rights.

## Reproduction

The native design files and tools are in `artwork/brands/snail/v1.0.0/`.
`outline-wordmark.py` uses pinned FontTools 4.60.1 and Brotli 1.1.0 to instance the
existing font at weight 600. `export.ts` uses the repository's pinned Sharp and
shared Hexly tokens. Source masters remain SVG; PNGs are documented rasterizations.

```sh
uv run --with fonttools==4.60.1 --with brotli==1.1.0 python artwork/brands/snail/v1.0.0/outline-wordmark.py
bun artwork/brands/snail/v1.0.0/export.ts
bun run assets:build
bun run docs:profiles
bun run assets:check
```

The export command is for preparing an uncommitted version and refuses to change
a version already committed to Git. For a revision, start a new version directory
and update its paths. Check light/dark marks at 16/24/32/64/128px, decode every ICO
entry, inspect the complete lockup, then verify the published HTTP bytes.
