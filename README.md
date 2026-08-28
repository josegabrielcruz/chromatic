# Chromatic

An interactive 3D visualization of the Art Institute of Chicago permanent collection, positioned in cylindrical HSL color space.

**[Live Demo](https://josegabrielcruz.github.io/chromatic)**

---

## What It Does

Each dot in the cloud is a work from the AIC collection, placed at coordinates derived from its dominant color:

| Axis | Dimension | Meaning |
|------|-----------|---------|
| Rotation around Y | Hue | Warm colors face one direction, cool another |
| Distance from Y axis | Saturation | Grays cluster at the center pole; vivid colors at the rim |
| Height | Lightness | Blacks at the bottom, whites at the top, midtones at the equator |

Orbit the cloud with mouse or touch. Hover a point to identify the work — title, artist, and date appear in the panel. The collection auto-rotates slowly so the full cylinder is visible without interaction.

---

## Caveats

**First 10,000 artworks only.** The AIC API's Elasticsearch index caps simple pagination at 10,000 results. Of those, roughly 20–40% carry color metadata — so the visualization typically shows ~2,000–4,000 works. The full collection is ~130,000 artworks; getting beyond 10,000 requires cursor-based `search_after` pagination (planned).

**Performance is still being tuned.** The rendering pipeline has been through several rounds of fixes (unclamped shader point sizes, stale VAO bindings, per-frame GPU buffer allocations, raycaster threshold scaling). The current implementation is stable but there are likely further gains available.

---

## Tech Stack

- **Vite** + **React 18** + **TypeScript**
- **React Three Fiber** + **@react-three/drei** — 3D scene and OrbitControls
- **Three.js** — BufferGeometry point cloud with custom ShaderMaterial
- **CSS custom properties** — museum-aesthetic design tokens (no framework)

---

## Running Locally

```bash
npm install
npm run dev
```

Requires Node 18+. If `public/collection.json` is present (committed to the repo), the app loads from it instantly with no API calls. If not, it falls back to fetching ~500 artworks live from the AIC API.

To regenerate the dataset:

```bash
npm run fetch-collection
```

This takes ~2 minutes (100 pages × 1.1 s) and writes `public/collection.json`. Commit the file when done. No API key required.

---

## How the Color Space Works

The AIC API returns a dominant color for each artwork as HSL values (`color.h`, `color.s`, `color.l`). These are mapped to cylindrical world coordinates:

```
x = (s / 100) × RADIUS × cos(h × π / 180)
z = (s / 100) × RADIUS × sin(h × π / 180)
y = (l / 100) × HEIGHT − HEIGHT / 2
```

A fully desaturated work (`s = 0`) sits on the vertical center axis regardless of hue. The most vivid works (`s ≈ 100`) orbit at the outer edge of the cylinder. Hue determines which arc of that edge they appear on.

---

## Roadmap

- [x] Pre-generated static dataset (`npm run fetch-collection` → `public/collection.json`)
- [ ] Cursor-based pagination to exceed 10,000 artworks (`search_after`)
- [ ] Era filter — animate the cloud to show only a selected date range
- [ ] Click-through to AIC artwork page
- [ ] Artwork thumbnail on hover (IIIF on-demand)
- [ ] Search / filter by artist or classification

---

## License

MIT
