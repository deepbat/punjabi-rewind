/* Punjabi Rewind — 2026 Hits Only
   HYBRID v405: youtubeIds + optional spotifyId. If YouTube blocked (101/150), player auto-switches to Spotify.
   If spotifyId missing, a Spotify search-embed fallback is used automatically — no API key needed.
   To add a direct Spotify track: open track -> Share -> Copy link -> /track/<ID> -> paste as spotifyId
   Every YouTube ID below checked against the oEmbed endpoint (200 = resolves and embeds). */
window.SONGS = [
/* ── Punjabi 2026 ── */
{title:'Dopamine',artist:'Guru Randhawa',year:2026,youtubeIds:['iOgR7hi90Ac'],lang:'punjabi'},
{title:'5-7',artist:'Karan Aujla',year:2026,youtubeIds:['x9RC77Oc-0Q','omWV2zs1B2I'],lang:'punjabi'},
{title:'Dealer',artist:'Diljit Dosanjh',year:2026,youtubeIds:['YwtvQ23_-34'],lang:'punjabi'},
{title:'Jackpot',artist:'Cheema Y ft. Gur Sidhu',year:2026,youtubeIds:['yM5APO87aNU','MUIEmo9VQ4I'],lang:'punjabi'},
{title:'Eyes On Me',artist:'Sidhu Moose Wala',year:2026,youtubeIds:['BxrUdlc4f7E','8DOcxb9kKy8'],lang:'punjabi'},
{title:'Gidha',artist:'R Nait ft. Himanshi Khurana',year:2026,youtubeIds:['UTYnBUaGTcU','zIl9eLe0P9I'],lang:'punjabi'},
{title:'Kath Lagda',artist:'Navaan Sandhu ft. Dhanda Nyoliwala',year:2026,youtubeIds:['nMozMETeCyw'],lang:'punjabi'},
{title:'Sadi Sun',artist:'Harsh Nussi',year:2026,youtubeIds:['6PHpxi-_GVY','LyuL9coDvsU'],lang:'punjabi'},
/* Dior: backup ID replaced — the old one 404s. New backup is the Kahlon Records upload (oEmbed-verified). */
{title:'Dior',artist:'Harf Cheema ft. Gurlez Akhtar',year:2026,youtubeIds:['gTpH5AOslOE','ERdKnGW70aQ'],lang:'punjabi'},
{title:'Moves',artist:'Shubh',year:2026,youtubeIds:['raaqmralEZw','w-tlQtHWJt4'],lang:'punjabi'},
{title:'Ranjha',artist:'Diljit Dosanjh ft. Sia & David Guetta',year:2026,youtubeIds:['fTpKWImEx84'],lang:'punjabi'},
{title:'Headliner',artist:'Navaan Sandhu',year:2026,youtubeIds:['3chYKmkd8c0'],lang:'punjabi'},
{title:'CEO',artist:'Cheema Y ft. Gur Sidhu',year:2026,youtubeIds:['W0MVY0hEWh0'],lang:'punjabi'},
{title:'Low Fade',artist:'Karan Aujla ft. Virat Kohli',year:2026,youtubeIds:['zwm_sRRVf6U','3j7bhOvW6jw'],lang:'punjabi'},
/* 5-7 Kille: official Jass Records video moved to primary — the old primary is embed-restricted (oEmbed 403). */
{title:'5-7 Kille',artist:'Amar Sehmbi',year:2026,youtubeIds:['VfwOhLVsrgY','3hJrhdshy3g'],lang:'punjabi'},
/* ── Hindi 2026 ── */
{title:'Ghar Kab Aaoge',artist:'Sonu Nigam, Arijit Singh, Diljit Dosanjh (Border 2)',year:2026,youtubeIds:['oodOj8jx8ds'],lang:'hindi'},
{title:'Ishq Da Chehra',artist:'Diljit Dosanjh, Sachet-Parampara (Border 2)',year:2026,youtubeIds:['vdOosB8iLiM'],lang:'hindi'},
{title:'Aari Aari',artist:'Shashwat Sachdev, Bombay Rockers (Dhurandhar: The Revenge)',year:2026,youtubeIds:['dESIGVxSSCE','f-9IaGAlgEA'],lang:'hindi'},
{title:'Main Aur Tu',artist:'Jasmine Sandlas, Reble (Dhurandhar: The Revenge)',year:2026,youtubeIds:['-dt1VE_9EJI'],lang:'hindi'},
{title:'Tu Hi Disda',artist:'Arijit Singh, Nikhita Gandhi (Bhooth Bangla)',year:2026,youtubeIds:['4jO8EWJutfE'],lang:'hindi'},
{title:'Tabaahi',artist:'Vishal Mishra',year:2026,youtubeIds:['h1kihH0l8iQ'],lang:'hindi'},
{title:'Yeh Awarapan',artist:'Arijit Singh',year:2026,youtubeIds:['I9tX-lFUTrw'],lang:'hindi'},
{title:'Khwaab Dekhoon',artist:'Arijit Singh, Tarannum Malik',year:2026,youtubeIds:['ujaFXF381Og'],lang:'hindi'},
{title:'Ek Din',artist:'Arijit Singh',year:2026,youtubeIds:['WwJrYr72Yuw'],lang:'hindi'},
{title:'Madhosh',artist:'Siddharth Basrur',year:2026,youtubeIds:['CxN85kBZiI8'],lang:'hindi'},
{title:'Sajan Tumse Pyar',artist:'Udit Narayan, Alka Yagnik',year:2026,youtubeIds:['t0uuQOvOFFA'],lang:'hindi'},
{title:'Not Guilty',artist:'Dhanda Nyoliwala',year:2026,youtubeIds:['E7ergOnpO1Q'],lang:'hindi'},
];
/* Removed three entries whose sources never existed (their only YouTube IDs 404 and no
   matching release exists on any platform): "Musafir" (Vishal Mishra), "Chamka Chamka"
   (Karan Deol / VDNZ), "Bolo Bolo" (Prateek Kuhad / KarmaCalls). */
