# Deepak's Punjabi Songs

An immersive Punjabi music rewind experience inspired by simple interactive single-page music players.

- 50 trending Punjabi hits from 2024–2026
- Exact YouTube IDs only (official channels / labels)
- Hidden YouTube iframe for lightweight audio playback
- No YouTube search or fallback
- Live search + year filters + artist filter in the song list
- Player extras: shuffle, repeat (off / all / one), click-to-seek progress, volume slider, mute
- WATCH button opens the official music video in an in-page modal
- Animated "aurora mesh" moving background with floating embers and a spinning vinyl motif
- Responsive
- GitHub Pages ready

## Files

- `index.html` — structure, player bar, video modal, filter toolbar
- `style.css` — styling + animated background
- `script.js` — player logic (shuffle / repeat / seek / volume / filters / video modal)
- `songs.js` — the song list (`window.SONGS`, each with verified `youtubeIds`)

## Usage

Open `index.html` in a browser (or serve the folder — e.g. `npx serve .`). Press **CHALA DO** or pick a track from **SONG LIST**. Keyboard shortcuts: `Space` play/pause, `←`/`→` previous/next, `M` mute, `R` repeat, `S` shuffle, `V` watch video, `Esc` close video.