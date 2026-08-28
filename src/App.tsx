import { useState } from 'react'
import { Scene }     from './components/Scene'
import { InfoPanel } from './components/InfoPanel'
import { useArtworkColors } from './hooks/useArtworkColors'
import './App.css'

export default function App() {
  const { artworks, status, error } = useArtworkColors()
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const hoveredArtwork = hoveredIndex !== null ? (artworks[hoveredIndex] ?? null) : null

  return (
    <div className="app">
      {/* ── 3D scene (fills the viewport) ───────────────────────── */}
      <Scene
        artworks={artworks}
        onHoverChange={setHoveredIndex}
      />

      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="app-header">
        <h1 className="app-title">Chromatic</h1>
        <p className="app-source">Art Institute of Chicago</p>
      </header>

      {/* ── Loading / error ─────────────────────────────────────── */}
      {status === 'loading' && (
        <div className="app-loading" aria-live="polite">
          <span className="app-loading__dot" />
          <span className="app-loading__text">Loading collection…</span>
        </div>
      )}

      {status === 'error' && (
        <div className="app-error" role="alert">
          <p>Unable to load collection data.</p>
          {error && <p className="app-error__detail">{error}</p>}
        </div>
      )}

      {/* ── Artwork info panel ───────────────────────────────────── */}
      {status === 'ready' && (
        <InfoPanel
          artwork={hoveredArtwork}
          totalCount={artworks.length}
        />
      )}

      {/* ── Legend ──────────────────────────────────────────────── */}
      {status === 'ready' && (
        <p className="app-legend">
          Hue · Saturation · Lightness — each work positioned by its dominant color
        </p>
      )}
    </div>
  )
}
