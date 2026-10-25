# Banner source assets

`archive_banner.png` is the existing archive illustration, retained at its original
1280 × 499 dimensions. Its deployed copy is `public/images/archive-banner.webp`.
Only the encoding changes; the composition, dimensions and banner masks stay the same.

Rebuild with the Sharp installation used by Astro:

```sh
node --input-type=module -e 'import sharp from "sharp"; await sharp("scripts/image-sources/archive_banner.png").webp({quality:88,effort:6}).toFile("public/images/archive-banner.webp")'
```

Original sources stay outside `public/` so production does not ship both formats.
