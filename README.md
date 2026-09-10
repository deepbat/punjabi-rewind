# Punjabi Rewind — A Sonic Constellation

**Live at <https://deepbat.github.io/punjabi-rewind/>**

50 all-time Hindi & Punjabi hits (25 each), presented as an
app inside a simulated Windows 11 desktop, with wallpaper, draggable windows,
a Start menu, and a taskbar.

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

## New features

- **Lyrics** — open the Lyrics app to view transliterated/English/Hindi lyrics for the current track.
- **Artists** — browse artist bios and top tracks, then hit Play all.
- **Playlists** — curated playlists: Chill, Workout, Retro Mix, Late Night, Party.
- **Queue** — playbar Queue button shows upcoming tracks from the current view; drag to reorder, remove, or clear.
- **Sleep timer** — cycles 15/30/45/60/Off from the playbar.
- **History** — last 50 played tracks with timestamps; replay from the History app.
- **Equalizer** — EQ popover with presets: Flat, Bass Boost, Vocal, Night Mode.
- **Reactions** — emoji votes per track with counts stored locally.
- **Shareable favorites** — copy a code from the Saved view and import it elsewhere.
- **Sticky Notes** — create color-coded notes, optionally linked to a track.
- **Stats** — top artists, genre split pie, estimated listening time.
- **Keyboard shortcuts** — `Ctrl+/` for shortcuts; Space, arrows, M, Q, S, F, L, Esc.
- **Track info** — click the now-playing cover/title for details and links.
- **Offline fallback** — graceful page with saved favorites if WebGL/JS fails.

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
| `lyrics.js` | Lyrics data + key helper |
| `artists.js` | Artist bios and top track indices |
| `playlists.js` | Curated playlists |
| `queue.js` | Queue panel with drag reorder and session persistence |
| `sleeptimer.js` | Sleep timer logic |
| `history.js` | Listening history persistence and replay |
| `equalizer.js` | EQ presets and popover |
| `reactions.js` | Emoji reactions per track |
| `sticky-notes.js` | Sticky Notes desktop app |
| `stats.js` | Listening stats dashboard |
| `track-info.js` | Now-playing details panel |
| `shortcuts.js` | Keyboard shortcuts overlay |
| `apps.js` | App registry/wiring for new desktop apps |
| `app.js` | Live clock and the onboarding hint fade |
| `favicon.svg` / `og-image.png` | Tab icon and the social share preview card |
