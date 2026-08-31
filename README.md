# Punjabi Wave — Dispatch 2026

A complete visual and structural rebuild. The old holographic sci-fi dashboard
is gone; this version is built around a screen-printed gig-poster and
cassette-culture identity — dark ink backgrounds, a cream poster "bill" for
the now-playing song, a tuner panel for live radio, ticket-style cards for
the vault, and a cassette-tape player bar pinned to the bottom of the screen.

All 30 tracks, all four radio stations, favorites, search, filtering,
shuffle, the hybrid YouTube → Invidious → Spotify fallback chain, and the
full-screen Live Mode visualizer carry over — only the design and the code
behind it are new. The four old "theme worlds" have been retired in favor of
one confident, consistent identity.

## Local preview

```bash
python3 -m http.server 8080
```

Then open <http://localhost:8080>.

## Project files

| File | Purpose |
| --- | --- |
| `index.html` | Masthead, tuner, bill, vault drawer, and player markup |
| `style.css` | The gig-poster / cassette visual system |
| `songs.js` | Curated track data (unchanged) |
| `radio.js` | Live-radio stations and failover behavior (unchanged logic, new hooks) |
| `player.js` | Playback, search, filtering, favorites, shuffle, hybrid source fallback |
| `live.js` | Full-screen beat-synced canvas visualizer (Live Mode) |
| `app.js` | Live IST clock and the single page-load entrance |

## Notes

Independent radio streams and YouTube embeds may occasionally be
unavailable — the dispatch retunes to the next station or source
automatically rather than failing silently.
