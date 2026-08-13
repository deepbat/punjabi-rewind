# Deepak's Punjabi Songs — The Punjabi Frequency

A static Punjabi music dashboard built around a fixed app shell rather than a long landing page. The redesigned experience keeps live radio, the now-playing gauge, editorial culture notes, and playback controls visible together on desktop, while adapting into a scrollable stacked shell on mobile.

## What is included

The dashboard includes a four-station Punjabi radio module with automatic failover messaging, a curated 30-track catalog spanning 2024–2026, YouTube and Spotify source links, previous/play/next controls, mute state, seekable progress, and a full-screen Live Mode visualizer. The four visual worlds remain switchable and are persisted locally with a shareable URL hash.

The song drawer now includes instant search across song titles and artists, year filters, a saved-tracks view backed by local storage, shuffle within the active view, clearer track cards, and accessible button states. The shell also has a richer status header, editor-style culture cards, an at-a-glance stats strip, clearer radio signal states, and improved mobile behavior.

## Local preview

From the project directory, run:

```bash
python3 -m http.server 8080
```

Then open <http://localhost:8080> in a browser.

## Project files

| File | Purpose |
| --- | --- |
| `index.html` | Dashboard shell, drawer, player, and Live Mode markup |
| `style.css` | Responsive visual system, theme tokens, panels, cards, and motion |
| `script.js` | Playback controls, filtering, search, favorites, shuffle, and seeking |
| `songs.js` | Curated track data and YouTube source IDs |
| `radio.js` | Live-radio stations, failover behavior, and shell status updates |
| `theme.js` | Visual worlds, persistence, parallax, and share-card generation |
| `livemode.js` | Full-screen canvas visualizer and Live Mode controls |

## Notes

The project uses third-party radio streams and YouTube embeds. Individual radio stations may be temporarily unavailable, and some YouTube videos may restrict embedding; when that happens, the dashboard keeps the direct YouTube action available instead of failing silently.
