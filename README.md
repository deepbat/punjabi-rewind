# Deepak's Punjabi Songs — Live Mode Edition

The centerpiece of this pass: **LIVE MODE**, a full-screen, beat-synced generative
visualizer you enter by grabbing a steering wheel instead of clicking a boring
play button. Genuinely pauseable, screenshot-shareable, and skinned live by
whichever of the 4 visual worlds you've picked.

## The new centerpiece: LIVE MODE
- **Entry**: a hand-drawn steering wheel control in the hero (idle-spins slowly,
  speeds up on hover, lightly drags under your cursor). Click or release-drag to
  "start the engine" — the whole page transitions into a full-screen visualizer.
- **The visualizer**: a canvas-rendered generative scene — a slowly rotating wheel
  motif, expanding rings on the "kick," particle bursts on the "snare," sparkle
  twinkles on the "hi-hat" — all timed to a per-song simulated groove (see honest
  note below) and colored from whichever theme is active, live.
- **Pauseable**: a literal pause button (and spacebar) freezes the animation
  mid-frame — verified with screenshots, the scene genuinely stops, not just the
  music — and shows a "PAUSED" badge. Resuming picks the timing back up cleanly.
- **Share this moment**: captures an actual screenshot of the live canvas at that
  instant, composites it with the song title/artist, and downloads it (or opens
  the native share sheet on mobile). Not a generic template card — the literal
  generative art you were looking at.
- Exit via the ✕ button or Escape; the underlying song keeps playing in the
  normal mini player when you leave, only Pause stops the music.

## Honest technical note — please read before showing this off
A cross-origin YouTube iframe does not expose raw audio data (no Web Audio API
access across origins), so **true frequency-reactive visuals aren't possible**
without hosting the audio yourself. What's built here is a *simulated groove*:
a deterministic 16-step pattern per song, driven by wall-clock time at that
song's approximate tempo — the same technique most "audio visualizers" use when
they don't have raw waveform access. It's convincing and it's genuinely
synced to a consistent rhythm, but it is not literally analyzing the YouTube
audio. If you ever want *true* audio-reactivity, that requires self-hosting
the audio files (e.g. via the Web Audio API's AnalyserNode) instead of YouTube.

## Also in this pass (carried over + fixed)
- 4 switchable visual worlds (Truck Art / Cinema Dhaba / Phulkari Loom / Basera
  Night), the "Now Jamming" share card, live radio with fail-over, and the
  earlier motif-scoping + embedding-disabled-song fixes all still here.
- 30-track list, filtered to genuine 2024–2026 releases.

## Please verify before publishing
- Click through Live Mode yourself once fonts (Bungee/Mukta/Outfit) load properly
  on GitHub Pages — my sandbox blocks Google Fonts, so my screenshots show serif
  fallback text; this is a sandbox-only limitation.
- Spot-check a few songs and the 4 radio stations as before.

## Local preview
python3 -m http.server 8080
