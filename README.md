# Deepak's Punjabi Songs

A nostalgic Punjabi music archive hosted as a static GitHub Pages site.

## Playback

Songs are played through YouTube's embedded player. The site does not host MP3 files. YouTube source IDs are stored in `songs.js`.

## Controls

- Play, pause, stop, previous and next
- Shuffle
- Search
- Artist and era filters
- YouTube playback stays inside the site
- Spotify buttons open a Spotify search for a selected song

## Important

Some classic recordings have multiple YouTube uploads. `youtubeIds` contains fallback IDs so the player can try another upload if one video is unavailable for embedding.
