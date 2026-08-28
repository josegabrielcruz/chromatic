// ── AIC API response types ────────────────────────────────────────────────────

export interface AicColor {
  h:          number
  s:          number
  l:          number
  percentage: number
  population: number
}

export interface AicArtwork {
  id:             number
  title:          string
  artist_display: string
  date_display:   string
  color:          AicColor | null
  image_id:       string | null
  thumbnail:      { alt_text: string | null } | null
}

// ── App domain types ──────────────────────────────────────────────────────────

/** An artwork that passed the color-data filter, with its 3D position computed. */
export interface ArtworkPoint {
  id:             number
  title:          string
  artist_display: string
  date_display:   string
  color:          AicColor           // guaranteed non-null after filter
  imageId:        string | null
  altText:        string | null
  /** World-space [x, y, z] in the cylindrical HSL layout. */
  position:       [number, number, number]
}
