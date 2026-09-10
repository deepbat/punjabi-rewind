/* Curated playlists */
window.PLAYLISTS = [
  { name: 'Chill', desc: 'Laid-back tracks to wind down', indices: [3, 6, 10, 13, 21, 27, 35] },
  { name: 'Workout', desc: 'High-energy beats to fuel your session', indices: [0, 4, 8, 16, 18, 31, 33] },
  { name: 'Retro Mix', desc: 'Classic Punjabi-Hindi throwback vibes', indices: [5, 15, 20, 25, 29, 30, 38] },
  { name: 'Late Night', desc: 'Midnight drives and quiet moments', indices: [7, 11, 14, 22, 26, 32, 39] },
  { name: 'Party', desc: 'Non-stop bangers for the dance floor', indices: [1, 2, 9, 12, 17, 19, 24] }
];
window.LAST_PLAYLIST = localStorage.getItem('pr_last_playlist') || null;
