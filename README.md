# Punjabi Wave — A Sonic Constellation

Third pass, and a genuinely different kind of thing: the entire page is one
WebGL scene, not a website with 3D bits bolted on.

Your 30 tracks are arranged as glowing points along a spiral around a
slowly-rotating core, radius growing with each track so it reads as a galaxy
arm rather than a flat grid. The four radio stations sit as blue beacons on
an outer ring. The camera drifts on autorotate until you touch it:

- **Drag** to orbit around the core.
- **Scroll / pinch** to dive in or pull back.
- **Click a light** to select it — the camera eases in on its own, the song
  starts, and its label appears. Click another light or scroll back out to
  keep exploring.
- **Autopilot** (top right) lets go of your input entirely and flies the
  camera through the field on its own, speeding up and pulsing with the
  simulated beat of whatever's playing.
- **☰** opens the "starmap index" — search, language filters, favorites,
  shuffle — a frosted panel that slides in without stopping the scene behind
  it, for when you want to find a specific track by name instead of hunting
  for its light.

Everything else — the 30-track library, the four-station radio failover, the
hybrid YouTube → Invidious → Spotify fallback chain, favorites, search — is
unchanged underneath. Only the shell is new, and this time the shell *is*
the experience rather than a container around it.

## Local preview

This needs a real server (ES modules and CSS2DRenderer won't load over
`file://`):

```bash
python3 -m http.server 8080
```
Then open <http://localhost:8080>. A WebGL-capable browser is required —
there's a plain-text fallback message if WebGL isn't available, but no
visual experience without it.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Scene mount point + the thin glass HUD layered on top |
| `style.css` | HUD styling only — the scene itself is drawn by `scene.js` |
| `scene.js` | The 3D experience: starfield, spiral of song markers, radio beacons, camera flight, raycasting, autopilot |
| `songs.js` | Curated track data (unchanged) |
| `radio.js` | Live-radio stations, failover, and scene "mood" color hooks |
| `player.js` | Playback, search, filtering, favorites, hybrid source fallback |
| `app.js` | Live clock and the onboarding hint fade |

## A note on testing

I don't have a browser available in the environment I built this in, so I
verified it the only way I could without eyes on it: every DOM id the
JavaScript looks up exists in the HTML, every CSS class used in the markup
has a matching rule, all tags balance, and all the JavaScript — including
`scene.js` as a real ES module — parses cleanly. That catches wiring
mistakes, not whether the 3D actually looks right at your screen size and
GPU. Please give it a real look before you push it anywhere.
