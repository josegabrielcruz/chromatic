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

**Live API fetch, not the full collection.** On load the app fetches 5 pages × 100 artworks from the AIC public API (~500 works). The complete collection is ~130,000 artworks; a preprocessed static dataset would replace the live fetch and show the full shape of the collection. This is planned but not yet implemented.

**Performance is still being tuned.** The rendering and GPU resource management have been through several rounds of fixes (unclamped shader point sizes, stale VAO bindings, per-frame buffer allocations). The current implementation is stable but there are likely further gains available — particularly around raycasting threshold tuning and potential use of `frameloop="demand"` once the drei OrbitControls damping interaction is resolved.

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

Requires Node 18+. On first load, ~500 artworks are fetched from the [AIC public API](https://api.artic.edu/docs/). No API key required. Works are filtered to those with color metadata before rendering.

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

- [ ] Offline-preprocessed dataset (full ~130k collection via [AIC GitHub data export](https://github.com/art-institute-of-chicago/api-data))
- [ ] Era filter — animate the cloud to show only a selected date range
- [ ] Click-through to AIC artwork page
- [ ] Artwork thumbnail on hover (IIIF on-demand)
- [ ] Search / filter by artist or classification

---

## License

MIT
