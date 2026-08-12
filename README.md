# Deepak's Punjabi Songs — Multi-World Edition

A Punjabi music & culture hub with **four switchable visual worlds**, a kinetic-type
hero with mouse parallax, live Punjabi radio with fail-over, a shareable "Now
Jamming" card generator, and 30 freshly-verified 2024–2026 hits.

## What's new in this pass
- **Theme switcher ("worlds")** — top pill dock, 4 full visual identities sharing
  the same layout/content: Truck Art, Cinema Dhaba (1970s marquee), Phulkari Loom
  (embroidery), Basera Night (village night sky). Persisted via localStorage, and
  shareable as a link (`#world=cinema`) so you can send someone a specific look.
- **Parallax hero** — on desktop, the kinetic title tilts in 3D toward your cursor.
- **Shareable "Now Jamming" card** — SHARE button in the player bar renders a
  branded canvas image of the current song and downloads it (or opens the native
  share sheet on mobile via Web Share API where supported).
- **Fixed the motif-leak bug** from the opencode build (decorative SVGs were
  `position:fixed` and bled through every section on scroll — now properly scoped).
- **Fixed the "cannot be played here" dead-end** — embedding-disabled errors now
  point you to the YouTube button instead of just failing silently.
- **Song list refreshed**: 30 tracks, filtered to genuine 2024–2026 releases only.
  `410` was removed — confirmed broken (label blocks embedding on that upload).
  6 tracks are freshly cross-verified this session (Dapper Dan, For A Reason, Low
  Fade, Jackpot, CEO, Ambarsaria); the rest carry over from the prior verified batch.

## Please verify before publishing
- **Radio stations** (`radio.js`): 4 independent third-party streams. I can't
  live-test arbitrary streaming servers from my sandbox — please click each once.
- **Song IDs** (`songs.js`): every ID was checked against search results and
  official-channel credit blocks, but YouTube embedding permissions can change.
  If anything shows "Can't play here," the graceful fallback now points to the
  YouTube button automatically — no dead ends.
- **Fonts**: Bungee/Mukta/Outfit won't load in network-restricted sandboxes (you'll
  see serif fallback in any screenshots I send) — this is sandbox-only and resolves
  normally on GitHub Pages.

## Ideas for next pass (not built yet)
- Richer share-card art (theme motif icon baked into the canvas render)
- A 5th "remix" world that randomly blends two palettes
- Confetti/haptic micro-interaction when switching worlds

## Local preview
python3 -m http.server 8080
# then open http://localhost:8080
