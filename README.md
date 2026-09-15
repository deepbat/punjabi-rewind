# Punjabi Rewind — fifty hits, painted in ink

**Live at <https://deepbat.github.io/punjabi-rewind/>**

Fifty all-time Hindi & Punjabi hits (25 each) inside an interactive **WebGL 2
fluid study**. The whole page is one GPU ink simulation: drag it, bloom it,
freeze it, save it — and let it answer every track you play.

- **Drag** anywhere to stir the ink and add colour.
- **Pick a track** from the library (search, All/Punjabi/Hindi, shuffle)
  — the canvas blooms on every change and breathes while the music plays.
- **Playlists** — All 50 hits, ★ Saved, Chill, Workout, Retro Mix, Late Night,
  Party. Pick one from the Playlist dropdown, then ▶ to play it. Combines
  with search, language filter and shuffle.
- **Live radio** — tap the 📡 Radio chip to jump to the radio block: 4 Punjabi
  stations with auto fail-over. Tuning pauses YouTube; picking a track stops
  the radio. `R` toggles radio.
- **Colour story** follows the track by default (warm stories for Punjabi,
  cool ones for Hindi) or pick Aurora / Ember / Lagoon / Prism yourself.
- **Audio Reactive** (panel toggle, on by default) — the ink listens in five
  bands: Bass expands the ink, Beats fire bursts, Vocals drift the colour,
  Treble stirs fine turbulence, Energy drives overall movement. Everything is
  attack/release damped so it feels organic. Per-band sensitivity sliders
  (0–200%) plus an opt-in 🎙 Mic mode for REAL FFT analysis of any music in
  the room. YouTube/radio streams are cross-origin, so browsers forbid FFT on
  them — they drive the same bands from a musical simulation instead.
  Toggle off for plain fluid behaviour; sliders and performance untouched.
- **Swirl, Ink lifetime, Brush size, Living flow, Soft glow, Quality** — the
  fluid controls, live, exactly as a fluid study should have them.
- **Dock**: Bloom · Freeze · Clear | Save (downloads the canvas as a PNG).
- **Now playing card**: cover, transport, progress, and a video toggle that
  slides the YouTube player in without ever leaving the page.

### Keyboard

`Space` play/pause · `←` `→` previous/next · `B` bloom · `F` freeze the ink ·
`C` clear · `S` save the canvas · `L` library · `V` video · `R` radio ·
`H` hide every control (press again to bring them back) · `/` search ·
`Esc` close what's open.

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
first click always plays. Favorites (`pr_favorites`), history (`pr_history`)
and last playlist (`pr_last_playlist`) live in `localStorage`. Radio uses plain
HTML5 audio streams with a 6 s tuning timeout and silent fail-over.

## Local preview

A plain static server is enough — the page uses classic scripts, so it also
survives `file://`:

```bash
python3 -m http.server 8080
```

Then open <http://localhost:8080>. WebGL 2 is required for the ink; without it
the page shows a clear message and the library and playback still work.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | The ink playground: canvas, brand, library, playlists, radio, controls, dock |
| `assets/fluid.js` | The WebGL 2 fluid engine (shaders, simulation, export) |
| `assets/fluid.css` | The ink-playground design system |
| `assets/rewind.js` | Library, playlists, radio, playback, favorites, history, keyboard |
| `assets/tracks.js` | The 50 all-time hits + radio stations + curated playlists |
| `favicon.svg` / `og-image.png` | Tab icon and the social share card |
