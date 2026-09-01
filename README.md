# Punjabi Wave — 26 on Repeat

Fourth pass, and a real genre change: no dark glass, no hardware metaphor, no
3D space. This is stark, high-contrast **kinetic typography** — closer to a
Swiss poster or a record label's flagship site than a dashboard.

One song title fills most of the screen at a time, set in huge black display
type on warm paper white. Every track gets its own accent hue computed from
its position in the list (song 1 sits near amber, song 30 wraps most of the
way around the color wheel) — so as you move through the set, the accent
color drifts with it. There's no card grid on the main stage, no console,
no scene — just the title, the artist line, a small paginated counter, and
a row of equalizer bars that comes alive when something's playing.

- **Scroll, arrow keys, or the ‹ › buttons** move between tracks — the title
  swaps with a quick fade/slide rather than a page transition.
- **Click the giant title itself** (or the small Play button) to play or
  pause.
- **Auto** lets it advance on its own every few seconds, for browsing
  hands-free.
- **Index ↗** opens a full-screen typographic list — search, language
  filters, favorites, shuffle — titles set at the same large display scale
  as the main stage, not small cards.
- **Radio** in the top-right does the same four-station live-radio failover
  as always; while it's live the accent hue shifts to signal you're
  listening to a stream rather than a track.

Underneath, everything is the same engine as the earlier builds: all 30
tracks, the YouTube → Invidious → Spotify hybrid fallback, favorites, search.
Only the shell changed — and this time the shell has no 3D and no
skeuomorphism at all, just type, color, and motion.

## Local preview

```bash
python3 -m http.server 8080
```
Then open <http://localhost:8080>.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | The stage, HUD, index overlay markup |
| `style.css` | The typographic system — fonts, per-track accent variable, layout |
| `songs.js` | Curated track data (unchanged) |
| `radio.js` | Live-radio stations, failover, accent-shift hook |
| `player.js` | Playback, title-swap animation, accent color engine, auto-advance, search/filter/favorites, hybrid source fallback |
| `app.js` | Live clock |

## Testing note

Same caveat as the last few builds: no browser available in the environment
I built this in. I verified every DOM id and CSS class referenced actually
exists on the other side, and all JavaScript parses cleanly — that catches
wiring mistakes, not whether the type scale, color drift, or transitions
actually feel right on your screen. Please look at it for real before
judging it.
