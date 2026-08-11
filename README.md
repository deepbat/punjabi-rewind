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


## Song database audit v2
Fallback YouTube sources have been removed. Player now uses only first explicitly assigned source and never switches to a similarly titled video. Metadata corrections include Apna Punjab Hove (1997), Pehle Lalkare Naal (1987), Sohniye (2006), Mitran Di Chhatri (2005), Madhaniyan (2016), and Yaar Mera Titliyan Warga (2020). Yaar Mera Titliyan Warga is intentionally disabled until an exact YouTube source is verified.


## Final playback safeguard
When YouTube starts a video, the player reads YouTube's actual video title and compares it with selected song title. A mismatch is stopped instead of playing a different song. There is no YouTube search fallback and no automatic fallback to another ID.
