# Punjabi Rewind

A retro Punjabi music archive built as a static GitHub Pages website.

## Features

- Vintage cassette-player interface
- YouTube playback
- Search
- Artist filtering
- Decade filtering
- Random classic
- Shuffle
- Previous / play / next / stop
- Keyboard controls
- Responsive design
- No backend
- No npm/build step

## Add YouTube songs

Open `songs.js`.

Each song has a `youtubeId` field:

```js
{
  title: "Tere Tille Ton",
  artist: "Kuldeep Manak",
  year: 1980,
  era: "80s",
  youtubeId: "VIDEO_ID_HERE"
}
```

For a YouTube URL like:

`https://www.youtube.com/watch?v=abc123XYZ`

use:

`youtubeId: "abc123XYZ"`

## GitHub Pages

In GitHub:

Settings → Pages → Deploy from a branch → `main` → `/ (root)` → Save.

The site can then be opened at:

`https://YOUR-USERNAME.github.io/punjabi-rewind/`

## Notes

The website does not host music files. Playback is provided through YouTube's embedded player. Use YouTube videos that are available for embedding and respect applicable rights and platform rules.


## Version 2

- Compact integrated YouTube source window
- No large video section
- Cassette deck is primary player interface
- Spotify links can be added per song using `spotifyUrl`
- YouTube remains the playback source


## YouTube verification
YouTube IDs in this version were checked against search results. Songs without a reliable exact match are intentionally left without a source rather than pointing to an unrelated recording.


## Version 3

- Illustrated Punjabi village hero scene
- Sunset village, well, fields, dancers, charpai and cooking hearth
- Functional HTML cassette player remains separate from artwork
- Animated atmospheric water/fire effects and gentle camera movement
- YouTube and Spotify actions remain functional
- Existing archive/search/filter functionality retained
