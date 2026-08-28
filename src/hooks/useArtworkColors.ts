import { useState, useEffect } from 'react'
import type { AicArtwork, ArtworkPoint } from '../types'

// ── Cylindrical HSL layout ────────────────────────────────────────────────────

const RADIUS = 4    // world units, max radius (full saturation)
const HEIGHT = 7    // world units, full height of the cylinder

function toPosition(h: number, s: number, l: number): [number, number, number] {
  const theta = (h / 360) * Math.PI * 2
  const r     = (s / 100) * RADIUS
  const y     = (l / 100) * HEIGHT - HEIGHT / 2
  return [r * Math.cos(theta), y, r * Math.sin(theta)]
}

function toArtworkPoint(a: AicArtwork & { color: NonNullable<AicArtwork['color']> }): ArtworkPoint {
  return {
    id:             a.id,
    title:          a.title,
    artist_display: a.artist_display,
    date_display:   a.date_display,
    color:          a.color,
    imageId:        a.image_id,
    altText:        a.thumbnail?.alt_text ?? null,
    position:       toPosition(a.color.h, a.color.s, a.color.l),
  }
}

// ── Static dataset (preferred) ────────────────────────────────────────────────
//
// Generate public/collection.json by running:
//   node scripts/fetch-collection.mjs
//
// The file contains pre-fetched artworks with color data from the AIC API.
// Serving it as a static asset eliminates API calls at runtime and allows
// showing the full fetched collection (~3,000–4,000 works) rather than 500.

const STATIC_URL = `${import.meta.env.BASE_URL}collection.json`

async function loadStatic(): Promise<ArtworkPoint[]> {
  const res = await fetch(STATIC_URL)
  if (!res.ok) throw new Error(`Static file not found (${res.status})`)
  const raw = await res.json() as Array<{
    id:             number
    title:          string
    artist_display: string
    date_display:   string
    color:          { h: number; s: number; l: number }
    image_id:       string | null
  }>
  return raw.map(a => ({
    id:             a.id,
    title:          a.title,
    artist_display: a.artist_display,
    date_display:   a.date_display,
    color:          a.color,
    imageId:        a.image_id,
    altText:        null,   // not stored in static dataset
    position:       toPosition(a.color.h, a.color.s, a.color.l),
  }))
}

// ── Live API fallback ─────────────────────────────────────────────────────────
//
// Used automatically when public/collection.json doesn't exist yet.
// Fetches 5 pages × 100 artworks from the AIC API at runtime.

const API      = 'https://api.artic.edu/api/v1'
const FIELDS   = ['id', 'title', 'artist_display', 'date_display', 'color', 'image_id', 'thumbnail'].join(',')
const PAGES     = 5
const PAGE_SIZE = 100

async function fetchPage(page: number): Promise<AicArtwork[]> {
  const url = `${API}/artworks?fields=${FIELDS}&limit=${PAGE_SIZE}&page=${page}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`AIC API error ${res.status}: ${url}`)
  const json = await res.json() as { data: AicArtwork[] }
  return json.data
}

async function loadLive(): Promise<ArtworkPoint[]> {
  const pages = await Promise.all(
    Array.from({ length: PAGES }, (_, i) => fetchPage(i + 1))
  )
  return pages
    .flat()
    .filter((a): a is AicArtwork & { color: NonNullable<AicArtwork['color']> } =>
      a.color !== null && a.color.s > 0
    )
    .map(toArtworkPoint)
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export type FetchStatus = 'loading' | 'ready' | 'error'

export interface UseArtworkColorsResult {
  artworks: ArtworkPoint[]
  status:   FetchStatus
  error:    string | null
  source:   'static' | 'live' | null
}

export function useArtworkColors(): UseArtworkColorsResult {
  const [artworks, setArtworks] = useState<ArtworkPoint[]>([])
  const [status,   setStatus]   = useState<FetchStatus>('loading')
  const [error,    setError]    = useState<string | null>(null)
  const [source,   setSource]   = useState<'static' | 'live' | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        // Try static file first — fast, offline-capable, full dataset
        let points: ArtworkPoint[]
        let src: 'static' | 'live'
        try {
          points = await loadStatic()
          src = 'static'
        } catch {
          // static file not generated yet — fall back to live API
          points = await loadLive()
          src = 'live'
        }

        if (cancelled) return
        setArtworks(points)
        setSource(src)
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

  return { artworks, status, error, source }
}
