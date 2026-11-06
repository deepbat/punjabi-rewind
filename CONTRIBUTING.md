# Contributing to Punjabi Rewind

Thanks for wanting to contribute!

## How to contribute

1. Fork the repo and create a branch from `main`.
2. Make your changes.
3. Run `npm run lint` to check JavaScript.
4. Open a pull request describing what you changed and why.

## Project structure

- `index.html` — main page: canvas, library, playlists, radio, controls
- `assets/fluid.js` — WebGL 2 fluid engine
- `assets/fluid.css` — styles
- `assets/rewind.js` — library, playback, radio, keyboard
- `assets/tracks.js` — 50 tracks, radio stations, playlists
- `offline-fallback.html` — offline fallback page
- `LICENSE` — MIT license

## Guidelines

- No build step — keep it vanilla HTML/CSS/JS.
- Prefer small, focused PRs.
- Update `README.md` if you change user-facing behavior.
- Respect `prefers-reduced-motion` and accessibility.

## License

MIT — see [LICENSE](LICENSE).
