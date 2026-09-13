# Snail — returning to a moment

Brand assets **2.0.0**, commissioned on 2026-09-13. Snail is a private library
for collecting, organizing and playing videos. A broad terracotta spiral holds
the collection; an ink-and-olive snail moves toward one quiet red point.

The animal is a real **Azure OpenAI gpt-image-2 raster generation**. Connected,
irregular facets run through shell and body, alongside Hexly's Frogie, Pew and
Ocelot family. Neither Eagle nor the rejected Snail v1 mark was a model input.
The v1 archive remains intact; its rejection does not erase its history.

- Project archive: https://hexly.ai/projects/snail#brand
- Asset base: https://hexly.ai/brands/snail/v2.0.0/
- Complete specimen page: `review.html`
- Exact filenames, byte lengths and SHA-256: `manifest.json`
- Requests, references, selection and processing: `provenance.json`
- Source: `artwork/brands/snail/v2.0.0/` and six dated studies under
  `artwork/logo-family/snail/` in `nocoo/hexly.ai`.

This is a brand publication. Adoption is a separate Snail-team change. The
application's reported 0.1.0 deployment is a candidate, with authenticated
production acceptance and its formal tag/Release still pending at this handoff.

## Asset roles

| Use | File | Contract |
| --- | --- | --- |
| Transparent source | `logo.png` | 2048 × 2048 native canvas; accepted opaque RGB unchanged |
| Header, sidebar, navigation | `mark-{16,24,32,48,64,128,256,512,1024,2048}.png` | Complete transparent animal; choose enough pixels for the display density |
| Explicit app-theme mark | `mark-light.png`, `mark-dark.png` | Identical transparent bytes; native animal colors work on both themes |
| Standard raster logo | `logo-light.png`, `logo-dark.png` | Identical transparent 1024px versions |
| Text-only identity | `wordmark-light.svg`, `wordmark-dark.svg` | Unchanged outlined Space Grotesk 600; select the app theme |
| Animal and wordmark | `lockup-light.png`, `lockup-dark.png` | 1362 × 576 transparent raster composition; preserve the complete ratio |
| Large app/README tile | `icon-light.png`, `icon-dark.png` | 2048px square with independent presentation; platform supplies masking |
| Rounded presentation | `icon-rounded.png` | Large display only; never a navigation mark |
| Wide archive/README image | `hero.webp`, `hero.png` | Native 2560 × 1024 generation; full frame, no crop |
| Narrow-screen hero | `hero-square.webp` | 1024px from the separately generated square; not a crop of the wide image |
| Browser tab | `favicon.ico` | Genuine transparent ICO, 16/32/48/64/128/256px PNG entries |
| Apple touch/PWA | `apple-touch-icon.png`, `icon-192.png`, `icon-{light,dark}-512.png` | Square sources; PWA purpose is `any`, not `maskable` |
| Subordinate background | `texture-{light,dark}.svg`, matching PNG | Independently authored 512px seamless spiral/trail tile |
| Audit and archive | `raw-icon.png`, `hero.png`, `white.png`, `prompt-{icon,hero}.txt` | Untouched generations, white derivative and exact submitted prompts |

There is **no native SVG animal**. No vectorization is needed for the current
web delivery; the wordmark is licensed font outlines and the texture is authored
support geometry. A future tracing must say “vectorized derivative,” retain its
source hash and receive its own version. Do not embed a raster in an SVG wrapper
and call it a vector master.

## Color, type and the single point

| UI role | Light | Dark |
| --- | --- | --- |
| Paper | `#f0f0e9` | `#1e2824` |
| Ink | `#30372e` | `#e6e9dc` |
| Terracotta | `#bf5c3c` | `#e79670` |
| Elevated surface | `#f8f8f2` | `#27332c` |
| Fine rules | `#d4d8cb` | `#3d4940` |

These are actual Hexly `src/styles/base.css` tokens at baseline
`352eb2652d4e11c876ef84152fc8e02f8d5ed331`, also shared with the Video Kit.
Generated animal pixels are sampled separately in `palette.json`; they are not
claimed to equal these UI hex values. Do not recolor or apply a CSS filter to the
animal. Keep the one red point attached to its composition. It is an identity
gesture, not a live status indicator; add accessible text for actual status.

Use ink for small text. The wordmark reuses the site's Space Grotesk 600 and
-1/23 em tracking, with unchanged v1 outlined glyphs. The unmodified WOFF2 and
SIL OFL 1.1 notices are included. Keep full letter bounds and line-height of at
least 1.2 for live Hexly text so the “y” descender is never clipped.

## Clear space, small sizes and backgrounds

Preserve the **entire native square** and scale uniformly. No crop, extra mask,
pose adjustment or added point. The native foreground clears the actual rounded
outline by **145.5px at 2048px**, exceeding the family's 128px minimum without
rescaling. Transparent navigation marks do not use that rounded mask.

- Mark: 16px minimum, **24px preferred** for navigation; supply a 2× raster on
  high-density displays. At 16px the shell and low silhouette carry recognition;
  fine facets, antennae and the red point soften. Do not promise detailed anatomy
  at favicon size.
- Wordmark: at least 72px wide. Lockup: at least 160px wide.
- Keep at least 6.25% of the square's width free around the visible artwork.
  The master already includes this clearance; do not trim it away.
- Transparent marks have no background, glow, CSS rounding or tile shadow.
  The animal's dark lower facets can recede on night paper; the warm shell and
  lighter head carry the silhouette. Never recolor to force every facet brighter.
- Use empty alt text beside a visible product name; otherwise label it “Snail.”
  Textures are decorative and motionless, with no information carried by color.

The repeatable texture uses a polygon spiral, broken facet paths and a returning
trail. Its ink opacity is 3.8%, accent opacity 3.2%; the SVG has a transparent
border, so adjacent tiles meet without a seam. Repeat at 360–480 CSS pixels and
choose the **application** theme explicitly. Use ink for text on a textured
surface: muted text over patterned light page paper can fall below 4.5:1.
Do not place high-contrast texture
over the animal or recolor the old identity's paths to fake a new texture.

## Integration

Pin the **published Hexly Git SHA** provided with the handoff. Download its
manifest from that commit, then verify each selected CDN file's byte count and
SHA-256. Copy selected exact bytes into Snail, retain the manifest and MIT/OFL
notices, and record the brand version, Hexly SHA and your own adoption commit.
No runtime request for the whole kit is required.

```html
<link rel="icon" href="/brand/favicon.ico" sizes="any">
<link rel="apple-touch-icon" href="/brand/apple-touch-icon.png">
<img src="/brand/mark-48.png" alt="" width="24" height="24">
<!-- Select this variant from the application's theme, not only the OS. -->
<img src="/brand/wordmark-light.svg" alt="Snail" width="80" height="40">
<picture>
  <source media="(max-width: 640px)" srcset="/brand/hero-square.webp"
    width="1024" height="1024">
  <img src="/brand/hero.webp" alt="A faceted snail moving toward one red point"
    width="2560" height="1024" style="display:block;width:100%;height:auto">
</picture>
```

The application theme may differ from the OS theme: choose the wordmark and
texture accordingly. The favicon and transparent animal are theme neutral.
Both hero sources keep their native composition; do not use `object-fit: cover`.

Only hexly.ai was modified for this commission. Snail owns its adoption, product
code, authentication acceptance and releases; these are outside this archive.

## Provenance, rights and reproduction

Six paid Azure OpenAI `/images/edits` requests used `gpt-image-2`, quality `high`:
three native 2048² icons and three independent 2560 × 1024 heroes. All prompts,
ordered reference hashes, actual request IDs, sanitized responses and untouched
PNG/C2PA bytes remain in Git. Codex selected Returning (01) with its Hero (04)
under owner-delegated batch acceptance. The owner did not review the exact new
bytes; Grok's different preference for candidate 02 is retained in the decision.

Finishing extracts only exterior-connected near-white pixels, protects the
animal and the separate point, and unmates boundary pixels. The exported master
preserves all **1,227,417 fully opaque pixels exactly**; 10,123 soft-edge pixels
carry alpha. No crop, scale adjustment, reposition, recolor or geometry retouch
was performed. Hero PNG is byte-identical to its native generation.

Authored code, texture and any generated-output rights held by the owner are
offered under MIT; see `license.txt` for the generation terms and limits. Font
rights remain SIL OFL 1.1. Reference assets are Hexly's archived family resources;
their use as model inputs does not transfer ownership of their original files.

```sh
# Preparing a NEW, uncommitted version only. Published versions are immutable.
bun artwork/brands/snail/v2.0.0/export.ts
bun run assets:build
bun run docs:profiles
bun run assets:check
```

The exporter refuses a committed version. Clone the recipe into a new version
for revisions; never rerun generation into an existing study or overwrite the
frozen finishing pass. The previous identity remains at
https://hexly.ai/brands/snail/v1.0.0/review.html with its original manifest.
