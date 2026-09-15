# Punjabi Rewind — fifty hits, painted in ink

**Live at <https://deepbat.github.io/punjabi-rewind/>**

Fifty all-time Hindi & Punjabi hits (25 each) inside an interactive **WebGL 2
fluid study**. The whole page is one GPU ink simulation: drag it, bloom it,
freeze it, save it — and let it answer every track you play.

- **Drag** anywhere to stir the ink and add colour.
- **Pick a track** from the library (search, All/Punjabi/Hindi/★ Saved, shuffle)
  — the canvas blooms on every change and breathes while the music plays.
- **Colour story** follows the track by default (warm stories for Punjabi,
  cool ones for Hindi) or pick Aurora / Ember / Lagoon / Prism yourself.
- **Swirl, Ink lifetime, Brush size, Living flow, Soft glow, Quality** — the
  fluid controls, live, exactly as a fluid study should have them.
- **Dock**: Bloom · Freeze · Clear | Save (downloads the canvas as a PNG).
- **Now playing card**: cover, transport, progress, and a video toggle that
  slides the YouTube player in without ever leaving the page.

### Keyboard

`Space` play/pause · `←` `→` previous/next · `B` bloom · `F` freeze the ink ·
`C` clear · `S` save the canvas · `L` library · `V` video · `H` hide every
control (press again to bring them back) · `/` search · `Esc` close what's open.

### How it works

The simulation runs entirely on the GPU — velocity, vorticity confinement,
pressure projection and a dye field, all in WebGL 2 fragment shaders in
`assets/fluid.js`. No libraries, no build step, no network requests for the
canvas itself. It honours `prefers-reduced-motion` (the ink starts frozen),
pauses its render loop while the tab is hidden, throttles itself to ~60 Hz on
high-refresh displays, and offers three quality tiers (Efficient, Balanced,
High detail).

Playback uses the YouTube IFrame API, and falls back to a direct embed (driven
by YouTube's own postMessage commands) when the API is blocked or slow, so the
first click always plays. Favorites (`pr_favorites`) and history (`pr_history`)
live in `localStorage` and are shared with the classic desktop app.

## The classic desktop app

The previous experience — a simulated Windows 11 desktop with draggable
windows, a Start menu, taskbar and the same 50 tracks — is preserved in full at
**[desktop.html](desktop.html)** (linked from the info panel and the WebGL
fallback card).

- File Explorer and Photos open onto the track library; Notepad holds the
  readme; windows minimize, maximize, snap and drag.
- Lyrics, Artists, Playlists, Queue, Sleep timer, History, Equalizer,
  Reactions, Sticky Notes, Stats and the shortcut sheet.
- Live radio, now-playing toasts, Party mode, wallpaper cycling.

## Local preview

A plain static server is enough — the new page uses classic scripts, so it also
survives `file://`:

```bash
python3 -m http.server 8080
```

Then open <http://localhost:8080>. WebGL 2 is required for the ink; without it
the page shows a clear message and the library and playback still work.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | The ink playground: canvas, brand, library, controls, dock |
| `assets/fluid.js` | The WebGL 2 fluid engine (shaders, simulation, export) |
| `assets/fluid.css` | The ink-playground design system |
| `assets/rewind.js` | Library, playback, favorites, history, keyboard |
| `assets/tracks.js` | The 50 all-time hits (oEmbed-verified YouTube IDs) |
| `desktop.html` | The classic Windows 11 desktop app (unchanged) |
| `assets/app.bundle.js` | Loader for the classic app's scripts and theme |
| `assets/app.core.js` | The classic app: desktop shell, apps, player, scene |
| `assets/fixes.js` | Classic app: fast playback, Halo menu, windowed fixes |
| `assets/no-fullscreen.js` | Blocks automatic fullscreen; manual still works |
| `assets/fluid-theme.css` | Earlier dark-glass theme for the classic app |
| `assets/styles.css` / `styles-base.css` | Classic app styling |
| `favicon.svg` / `og-image.png` | Tab icon and the social share card |

## Classic desktop app — full feature list

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

### Spark extras ✨

- **Every icon works** — desktop icons, Start menu, sidebar and playbar buttons are wired with timing-proof binding, so Lyrics/Artists/Playlists/History/Stats always open.
- **Living visualizer** — 24-bar EQ in the playbar dances while music plays; the covers pulse with the beat.
- **Now-playing toasts** — Windows-style notifications slide in on every track change.
- **🪩 Party mode** — hero Party button: DJ Spark shuffles all 50 hits nonstop and rotates wallpapers every 12 seconds.
- **🖼️ Wallpaper button** — cycle Bloom/Aurora/Mesh/Dark instantly from the hero.
- **Track facts** — the Lyrics app shows a "Did you know?" story for every all-time hit, plus sing-along on YouTube.
- **Artists A–Z** — all 24 artists with bios, search, and one-tap play.
- **Right-click the desktop** — Sort, Refresh, Next desktop background, New folder/text file, Display settings.

