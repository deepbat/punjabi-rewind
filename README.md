# Punjabi Wave — Dispatch Deck

Second pass, rebuilt around one idea: the whole screen **is** a piece of
hardware — a tape-deck / radio console — instead of a webpage you scroll
through. On desktop, it fits one viewport with no scrolling at all:

- **Tuner module** (left) — a real analog frequency dial with a needle that
  swings to each station and jitters while it's tuning, four station presets,
  and the same automatic fail-over as before if a stream drops.
- **Deck module** (center) — spinning cassette reels, an animated tape
  window, a ten-bar VU meter, an LCD now-playing readout, and chunky
  transport buttons.
- **Vault module** (right) — a "drawer front" showing what's up next; pulling
  it open slides out a card-catalog panel over the console with search,
  language filters, favorites, and shuffle — all 30 tracks, unchanged.
- **Eject ▸ Live Mode** — the full-screen beat-synced visualizer, recolored
  to match, still there.

Short or narrow screens (phones, small laptop windows) can't fit a console
this dense in one viewport honestly, so below 901px wide or 620px tall it
gracefully falls back to a normal scrolling stack — same modules, one on top
of another.

## Local preview

```bash
python3 -m http.server 8080
```
Then open <http://localhost:8080>.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | The console markup — top plate, tuner, deck, vault teaser, base plate |
| `style.css` | The tape-deck visual system: brushed-metal plates, LCDs, needle, reels, VU meters |
| `songs.js` | Curated track data (unchanged) |
| `radio.js` | Live-radio stations, failover, and the needle-position logic |
| `player.js` | Playback, search, filtering, favorites, shuffle, hybrid source fallback |
| `live.js` | Full-screen beat-synced canvas visualizer (Live Mode) |
| `app.js` | Live IST clock and the one-time load-in |
