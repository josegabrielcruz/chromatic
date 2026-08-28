import type { ArtworkPoint } from '../../types'
import './InfoPanel.css'

interface InfoPanelProps {
  artwork:    ArtworkPoint | null
  totalCount: number
}

export function InfoPanel({ artwork, totalCount }: InfoPanelProps) {
  return (
    <div className={`info-panel ${artwork ? 'is-visible' : ''}`}>
      {artwork ? (
        <div className="info-panel__content">
          <div
            className="info-panel__swatch"
            style={{
              background: `hsl(${artwork.color.h}, ${artwork.color.s}%, ${artwork.color.l}%)`,
            }}
            aria-hidden="true"
          />
          <div className="info-panel__meta">
            <p className="info-panel__title">{artwork.title}</p>
            <p className="info-panel__artist">{artwork.artist_display}</p>
            <p className="info-panel__date">{artwork.date_display}</p>
          </div>
        </div>
      ) : (
        <p className="info-panel__hint">
          {totalCount > 0
            ? `${totalCount.toLocaleString()} works · hover to identify`
            : null}
        </p>
      )}
    </div>
  )
}
