# Deepak's Punjabi Songs — Dashboard Edition

This pass is a genuine structural redesign, not a reskin. Full context: the
previous three passes kept the same "hero → marquee → scroll to radio → scroll
to songs → footer" landing-page skeleton and only changed colors, motifs, and
added an overlay (Live Mode). You correctly called that out as not a real
design change — this rebuilds the layout itself.

## What actually changed
- **The whole paradigm**: this is no longer a scrolling marketing page. It's a
  fixed-viewport **dashboard app shell** — on desktop, the live radio, the
  now-playing gauge, and the culture notes are all visible on screen
  simultaneously, with zero scrolling. That's the actual structural difference
  you asked for.
- **Radio is permanent**, not something you scroll down to find — it's a
  standing pod on the left, always live.
- **The center pod is a real gauge cluster**: a circular readout housing the
  kinetic title/artist, with the steering wheel control built into it as the
  entry to Live Mode.
- **Songs are a slide-up drawer**, not a page section — opens over the
  dashboard, closes back to it. Nothing to scroll past.
- **The player bar is a flush dashboard console** at the bottom of the shell,
  not a floating pill card anymore.
- Mobile stacks the three pods in a scrollable app-shell area, but the header
  and player stay pinned — still a fundamentally different feel from a long
  marketing page, even though a phone screen can't fit all three pods at once.
- As a side effect, this also permanently eliminates the "motif bleeding
  through sections" bug class from earlier passes — there's no more tall
  scrolling page for a background element to leak down into.

## Everything from before still works, carried over as-is
- 4 switchable worlds (Truck Art / Cinema Dhaba / Phulkari Loom / Basera
  Night) — now reflected instantly across the whole dashboard, including
  Live Mode's visualizer palette.
- Live Mode: full-screen beat-synced visualizer, genuinely pauseable, with
  the "Share This Moment" canvas-screenshot feature.
- Live radio with 4-station fail-over.
- 30-track list, 2024–2026 only, verified this session.

## Please verify before publishing
- Songs and radio stations as noted in earlier passes — I can't live-test
  arbitrary YouTube/streaming endpoints from this sandbox.
- Fonts show serif fallback in my screenshots (sandbox blocks Google Fonts);
  resolves normally on GitHub Pages.

## Local preview
python3 -m http.server 8080
