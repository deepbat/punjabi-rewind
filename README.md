# Pind Rewind — Punjabi Music · Radio · Virsa

An award-style Punjabi cultural hub. A living "golden hour in the pind" backdrop (wheat field, village silhouettes, phulkari petals, birds, sun) wraps a complete music player, live Punjabi radio directory and a daily shot of virsa (culture).

## What's inside

- **MUSIC** — 50 trending Punjabi hits (2024–2026), exact YouTube IDs only, hidden iframe audio playback, no search fallback
  - Live search + year filter chips + artist dropdown
  - Shuffle, repeat (off / all / one), click-to-seek progress, volume slider, mute
  - **WATCH** button opens the official music video in an in-page modal (with an "Open on YouTube" fallback)
  - Current-track highlight, playing vinyl animation, keyboard shortcuts
- **LIVE RADIO** — curated directory of Punjabi stations (Punjabi Virsa, Chardi Kala, Desi World, Old Punjabi Songs, Radio Punjab NA, Panjab Radio UK). Each "TUNE IN" opens the verified official live player — free, instant, no signup.
- **VIRSA** — a daily Punjabi proverb (lok kahaavat) + phulkari-style cards about Bhangra, Giddha, the turban, Sarso da Saag, Vaisakhi, the kikar tree chaura, the mela, lassi and the tractor.

## Files

- `index.html` — structure: animated backdrop, tabs, music/radio/virsa pages, player bar, video modal
- `style.css` — the whole pind-theme design + animations (fixed cinematic backdrop)
- `script.js` — tabs, player logic, filters, video modal, background generation, parallax
- `songs.js` — `window.SONGS` (50 verified tracks)
- `radio.js` — `window.RADIO_STATIONS` (verified official listen links)
- `culture.js` — `window.CULTURE` (quotes + facts)

## Usage

Serve the folder (`npx serve .`) or just open `index.html`. Press **CHALA DO** or choose from **SONG LIST**. Switch tabs for Radio & Virsa. Keyboard: `Space` play/pause, `←`/`→` prev/next, `M` mute, `R` repeat, `S` shuffle, `V` watch video, `Esc` close.

> Tip: if you ever see an older version, hard-refresh (Ctrl+Shift+R) — asset URLs are cache-busted (`?v=3`).