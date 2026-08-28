import { useState, useEffect } from 'react'
import type { AicArtwork, ArtworkPoint } from '../types'

// ── Cylindrical HSL layout ────────────────────────────────────────────────────
//
//   Hue    → angle θ around the Y axis   (0° = red, 120° = green, 240° = blue)
//   Sat    → radial distance from Y axis  (0 = gray pole, 1 = vivid rim)
//   Light  → height along Y axis          (0 = black, 0.5 = midtone, 1 = white)
//
const RADIUS = 4    // world units, max radius (full saturation)
const HEIGHT = 7    // world units, full height of the cylinder

function toPosition(h: number, s: number, l: number): [number, number, number] {
  const theta = (h / 360) * Math.PI * 2
  const r     = (s / 100) * RADIUS
  const y     = (l / 100) * HEIGHT - HEIGHT / 2
  return [r * Math.cos(theta), y, r * Math.sin(theta)]
}

// ── AIC API ───────────────────────────────────────────────────────────────────

const API   = 'https://api.artic.edu/api/v1'
const FIELDS = [
  'id', 'title', 'artist_display', 'date_display',
  'color', 'image_id', 'thumbnail',
].join(',')
const PAGES     = 5   // 5 × 100 = 500 artworks per session
const PAGE_SIZE = 100

async function fetchPage(page: number): Promise<AicArtwork[]> {
  const url = `${API}/artworks?fields=${FIELDS}&limit=${PAGE_SIZE}&page=${page}`
  const res  = await fetch(url)
  if (!res.ok) throw new Error(`AIC API error ${res.status}: ${url}`)
  const json = await res.json() as { data: AicArtwork[] }
  return json.data
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export type FetchStatus = 'loading' | 'ready' | 'error'

export interface UseArtworkColorsResult {
  artworks: ArtworkPoint[]
  status:   FetchStatus
  error:    string | null
}

export function useArtworkColors(): UseArtworkColorsResult {
  const [artworks, setArtworks] = useState<ArtworkPoint[]>([])
  const [status,   setStatus]   = useState<FetchStatus>('loading')
  const [error,    setError]    = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        // Fetch all pages in parallel — 5 concurrent requests is well within AIC limits
        const pages = await Promise.all(
          Array.from({ length: PAGES }, (_, i) => fetchPage(i + 1))
        )
        if (cancelled) return

        const points: ArtworkPoint[] = pages
          .flat()
          .filter((a): a is AicArtwork & { color: NonNullable<AicArtwork['color']> } =>
            a.color !== null
          )
          .map(a => ({
            id:             a.id,
            title:          a.title,
            artist_display: a.artist_display,
            date_display:   a.date_display,
            color:          a.color,
            imageId:        a.image_id,
            altText:        a.thumbnail?.alt_text ?? null,
            position:       toPosition(a.color.h, a.color.s, a.color.l),
          }))

        setArtworks(points)
        setStatus('ready')
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Unknown error')
        setStatus('error')
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  return { artworks, status, error }
}
