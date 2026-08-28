#!/usr/bin/env node
/**
 * scripts/fetch-collection.mjs
 *
 * Fetches AIC artworks that have color metadata and writes a compact static
 * dataset to public/collection.json. Run once, commit the output.
 *
 * Usage:
 *   node scripts/fetch-collection.mjs
 *
 * Requirements: Node 18+ (uses native fetch and fs/promises).
 * No npm packages needed.
 *
 * The AIC API's Elasticsearch index caps simple pagination at page × limit
 * ≤ 10,000, so we can reliably retrieve the first 10,000 artworks. Of those,
 * roughly 20–40% carry color data — typically 2,000–4,000 works. This is
 * already ~8× more than the live-fetch baseline of ~500.
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { dirname, join }                         from 'path'
import { fileURLToPath }                         from 'url'

// ── Config ───────────────────────────────────────────────────────────────────

const API      = 'https://api.artic.edu/api/v1'
const FIELDS   = 'id,title,artist_display,date_display,color,image_id'
const LIMIT    = 100           // artworks per API page
const MAX_PAGES = 100          // page 100 × limit 100 = 10,000 (Elasticsearch cap)
const DELAY_MS  = 1100         // ~55 req/min — conservative, well within 60/min limit
const CHECKPOINT_EVERY = 10   // save progress every N pages in case of interruption

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT    = join(__dirname, '../public/collection.json')

// ── Helpers ───────────────────────────────────────────────────────────────────

const sleep = ms => new Promise(r => setTimeout(r, ms))

function eta(donePages, totalPages, delayMs) {
  const remaining = (totalPages - donePages) * delayMs / 1000
  if (remaining < 60)  return `${Math.round(remaining)}s`
  return `${Math.round(remaining / 60)}m`
}

async function fetchPage(page, retries = 3) {
  const url = `${API}/artworks?fields=${FIELDS}&limit=${LIMIT}&page=${page}`
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15_000) })
      if (res.status === 429) {
        // Rate-limited — back off for 60 s then retry
        process.stdout.write('\n  Rate limited, waiting 60 s…')
        await sleep(60_000)
        continue
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (err) {
      if (attempt < retries) {
        process.stdout.write(`\n  Page ${page} failed (${err.message}), retrying in 5 s…`)
        await sleep(5_000)
      } else {
        throw err
      }
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n── Chromatic collection prefetch ─────────────────────────────\n')
  console.log(`  Output  → ${OUTPUT}`)
  console.log(`  Pages   → 1–${MAX_PAGES} (up to ${MAX_PAGES * LIMIT} artworks)`)
  console.log(`  Delay   → ${DELAY_MS} ms/page (~${Math.round(60000 / DELAY_MS)} req/min)\n`)

  const artworks = []
  let totalInCollection = null

  for (let page = 1; page <= MAX_PAGES; page++) {
    let data
    try {
      data = await fetchPage(page)
    } catch (err) {
      console.error(`\n  Fatal error on page ${page}: ${err.message}`)
      console.log(`  Saving partial results (${artworks.length} artworks)…`)
      break
    }

    totalInCollection ??= data.pagination?.total

    const colored = data.data.filter(a => a.color !== null && a.color.s > 0)

    for (const a of colored) {
      artworks.push({
        id:    a.id,
        title: a.title,
        artist_display: a.artist_display,
        date_display:   a.date_display,
        color: { h: a.color.h, s: a.color.s, l: a.color.l },
        image_id: a.image_id ?? null,
      })
    }

    // Progress line
    const pct = totalInCollection
      ? ((page * LIMIT / totalInCollection) * 100).toFixed(1)
      : '?'
    process.stdout.write(
      `\r  Page ${String(page).padStart(3)}/${MAX_PAGES}` +
      `  |  ${String(colored.length).padStart(3)} colored this page` +
      `  |  ${String(artworks.length).padStart(5)} total` +
      `  |  ${pct}% of ${totalInCollection?.toLocaleString() ?? '?'} collection` +
      `  |  ETA ~${eta(page, MAX_PAGES, DELAY_MS)}    `
    )

    // Periodic checkpoint
    if (page % CHECKPOINT_EVERY === 0) {
      mkdirSync(dirname(OUTPUT), { recursive: true })
      writeFileSync(OUTPUT, JSON.stringify(artworks))
    }

    if (page < MAX_PAGES) await sleep(DELAY_MS)
  }

  // Final write
  mkdirSync(dirname(OUTPUT), { recursive: true })
  writeFileSync(OUTPUT, JSON.stringify(artworks))

  const sizeKb = (Buffer.byteLength(JSON.stringify(artworks)) / 1024).toFixed(1)

  console.log('\n\n── Results ───────────────────────────────────────────────────\n')
  console.log(`  Artworks with color data : ${artworks.length.toLocaleString()}`)
  console.log(`  File size (uncompressed) : ${sizeKb} KB`)
  console.log(`  Output                   : ${OUTPUT}`)
  console.log('\n── Next steps ────────────────────────────────────────────────\n')
  console.log('  1. Inspect public/collection.json to verify the data looks right')
  console.log('  2. Run: npm run dev — the app will load from the static file')
  console.log('  3. Commit public/collection.json to the repo\n')
}

main().catch(err => {
  console.error('\nFatal:', err)
  process.exit(1)
})
