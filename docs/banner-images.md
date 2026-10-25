# Article banner images

For approved visual direction and article-specific examples, read
[Poster art direction](poster-art-direction.md). This document describes the
current implementation rather than a mandatory image style.

Article frontmatter owns the artwork and its composition. `PostLayout` forwards
it to the shared `SiteBanner`; it does not select styles by article slug.

- `hero`: day image; omit it for a compact, text-only banner.
- `heroNight`: optional night image; otherwise reuse `hero`.
- `heroLayout`: optional composition, one of:
  - `default`: existing scenic overlay, including its mobile crop.
  - `wide`: same desktop overlay; on mobile, use the full viewport width and
    anchor the image at the top right instead of cropping outside the viewport.
  - `illustration`: narrower right-aligned desktop illustration; on mobile,
    reserve space beneath the text and place the illustration there.

Without `hero`, image composition has no effect. The banner follows its content
height, preserves full title and summary wrapping, and adds no placeholder image.
The home, archive and about banners retain their own existing compositions.

Prefer an appropriately sized WebP for deployed artwork. Keep an original source
outside `public/` if it is needed for regeneration, and verify both themes and
narrow screens when selecting a composition.
