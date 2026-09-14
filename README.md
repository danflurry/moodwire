# Moodwire

Moodwire is a live emotional map of the news. It clusters related headlines from established RSS and Atom feeds into consensus story cards, then positions those cards by reader mood (happy on the left, sad on the right) and interaction volume (most active at the top).

## What is included

- 20 server-fetched feeds, refreshed on a one-minute cache cycle
- Worker-side headline clustering and consensus-title selection
- dense, animated grid packing with card areas from 4–16 cells
- Happy, Neutral, and Sad reactions with D1 persistence
- 30 deterministic simulated readers who continually move the map
- two-sided cards with direct article links for every clustered source
- responsive touch controls, reduced-motion support, and keyboard access
- WebMCP tools for listing visible stories and rating a story

## Architecture

The production artifact is a dependency-free Cloudflare Worker. `src/` contains the browser experience, `server/worker-runtime.js` contains the feed/API runtime, and `scripts/build-standalone.mjs` creates `dist/server/index.js`. D1 migrations live in `drizzle/`.

The Worker exposes a scheduled handler and also refreshes opportunistically when the active site requests news after the one-minute cache expires. This keeps the visible site current even on hosting surfaces where a cron trigger is not attached.

## GitHub Pages frontend

The repository includes a GitHub Actions workflow that publishes `src/` to GitHub Pages. The browser connects to the public Moodwire Worker for live RSS aggregation, article-level source links, and D1-backed reactions. If that API is temporarily unreachable, the interface keeps running with clearly labeled sample stories and retries automatically.
