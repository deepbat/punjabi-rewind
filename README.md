# Deepak's Punjabi Songs — Truck-Art Edition

A Punjabi music & culture mini-hub: kinetic-typography hero, hand-painted-truck visual
frame (all CSS/SVG, no heavy photo assets), 35 trending hits (2024-2026), and a live
Punjabi internet-radio dial with automatic station fail-over.

## What changed from v1
- Full visual redesign: truck-art ornamental borders/rails + kinetic typography hero
  (song title/artist becomes the "visualizer", pulsing while playing)
- No more 3MB hero photo — background is pure CSS/gradient/SVG, much lighter to load
- New "Live Punjabi Radio" module (radio.js) — see RADIO_STATIONS in radio.js to edit
- Active song highlighted in the list while playing
- If a song's primary YouTube ID fails, the player now tries a listed backup ID
  before giving up
- Escape key closes the song list panel

## Live radio — please read before publishing
The three stations in `radio.js` are independent, third-party internet-radio streams
found via public radio directories (not run by this site). Small stream servers do
go offline over time. I could not live-test these from my sandbox (no general network
access there), so **please open the site once and click each station to confirm they
still play for you** before you publish. If one is dead, just delete or replace its
line in `RADIO_STATIONS` — the fail-over logic will keep working with whatever's left.
To add a station: paste its direct stream URL (must be `https://`, not `http://`, or
browsers will block it as mixed content on a https-served GitHub Pages site).

## Local preview
python3 -m http.server 8080
# then open http://localhost:8080

Note: Google Fonts (Bungee/Mukta/Outfit) won't load in network-restricted sandboxes —
that's a sandbox-only limitation and will work normally on GitHub Pages.
