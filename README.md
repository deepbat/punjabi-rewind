# Punjabi Rewind — A Sonic Constellation

**Live at <https://deepbat.github.io/punjabi-rewind/>**

40 Hindi & Punjabi tracks of 2026, arranged as glowing points along a spiral
around a slowly-rotating core — a galaxy you fly through — presented as an
app inside a simulated Windows 11 desktop, with wallpaper, draggable windows,
a Start menu, and a taskbar. The four live radio stations sit as blue beacons
on an outer ring.

- **Drag** to orbit around the core.
- **Scroll / pinch** to dive in or pull back.
- **Click a light** to select it — the camera eases in on its own, the song
  starts, and its label appears. Click another light or scroll back out to
  keep exploring.
- **Brand button (top left)** flies the camera back to the wide view.
- **Autopilot** (top right) lets go of your input entirely and flies the
  camera through the field on its own, speeding up and pulsing with the
  simulated beat of whatever's playing.
- **☰** opens the "starmap index" — search, language filters, favorites,
  shuffle — a frosted panel that slides in without stopping the scene
  behind it.
- **Search** works from the taskbar or the Start menu: typing filters the
  pinned apps, and Enter hands the same query to the track index.
- The desktop chrome is real too: File Explorer and Photos open onto the
  track library, Notepad has the readme, and windows minimize, maximize,
  and drag.

Playback is a hybrid chain: YouTube first, an Invidious proxy if the embed
is blocked, then a Spotify embed when the track has a verified `spotifyId`.
Favorites persist in `localStorage`. The scene respects
`prefers-reduced-motion` (no auto-rotation or ambient drift) and pauses its
render loop while the tab is hidden.

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
| `index.html` | Desktop shell markup + the app window the scene mounts into |
| `style.css` | HUD, vault panel, and player-dock styling inside the app window |
| `win11.css` | Desktop chrome: wallpaper, icons, window frames, Start menu, taskbar |
| `win11.js` | Window management, Start menu + search, generic apps (Explorer, Photos, Notepad, Edge) |
| `scene.js` | The 3D experience: starfield, spiral of song markers, radio beacons, camera flight, raycasting, autopilot |
| `songs.js` | Curated track data (YouTube IDs oEmbed-verified) |
| `radio.js` | Live-radio stations, failover, and scene "mood" color hooks |
| `player.js` | Playback, search, filtering, favorites, hybrid source fallback |
| `app.js` | Live clock and the onboarding hint fade |
| `favicon.svg` / `og-image.png` | Tab icon and the social share preview card |
