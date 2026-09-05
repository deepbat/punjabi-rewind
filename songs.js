/* Punjabi Rewind — 2026 Hits Only
   HYBRID v405: youtubeIds + optional spotifyId. If YouTube blocked (101/150), player auto-switches to Spotify.
   If spotifyId missing, a Spotify search-embed fallback is used automatically — no API key needed.
   To add a direct Spotify track: open track -> Share -> Copy link -> /track/<ID> -> paste as spotifyId
   Every YouTube ID below checked against the oEmbed endpoint (200 = resolves and embeds).
   September 2026 refresh: 40 tracks. New picks cross-checked against Apple Music India weekly
   charts (recotop), Mirchi Top 20 and Ormax reporting; every video ID title-matched via oEmbed. */
window.SONGS = [
/* ── Punjabi 2026 ── */
{title:'Low Fade',artist:'Karan Aujla ft. Virat Kohli',year:2026,youtubeIds:['zwm_sRRVf6U','3j7bhOvW6jw'],lang:'punjabi'},
{title:'5-7',artist:'Karan Aujla',year:2026,youtubeIds:['x9RC77Oc-0Q','omWV2zs1B2I'],lang:'punjabi'},
{title:'Top Fella',artist:'Karan Aujla & MXRCI',year:2026,youtubeIds:['V1aGtu68hC4'],lang:'punjabi'},
{title:'Sohniye',artist:'Shubh',year:2026,youtubeIds:['YY583HmKBzA'],lang:'punjabi'},
{title:'Moves',artist:'Shubh',year:2026,youtubeIds:['raaqmralEZw','w-tlQtHWJt4'],lang:'punjabi'},
{title:'Dealer',artist:'Diljit Dosanjh',year:2026,youtubeIds:['YwtvQ23_-34'],lang:'punjabi'},
{title:'Ranjha',artist:'Diljit Dosanjh ft. Sia & David Guetta',year:2026,youtubeIds:['fTpKWImEx84'],lang:'punjabi'},
{title:'Eyes On Me',artist:'Sidhu Moose Wala',year:2026,youtubeIds:['BxrUdlc4f7E','8DOcxb9kKy8'],lang:'punjabi'},
{title:'Jackpot',artist:'Cheema Y ft. Gur Sidhu',year:2026,youtubeIds:['yM5APO87aNU','MUIEmo9VQ4I'],lang:'punjabi'},
{title:'CEO',artist:'Cheema Y ft. Gur Sidhu',year:2026,youtubeIds:['W0MVY0hEWh0'],lang:'punjabi'},
{title:'Kath Lagda',artist:'Navaan Sandhu ft. Dhanda Nyoliwala',year:2026,youtubeIds:['nMozMETeCyw'],lang:'punjabi'},
{title:'Headliner',artist:'Navaan Sandhu',year:2026,youtubeIds:['3chYKmkd8c0'],lang:'punjabi'},
{title:'Hood Ambience',artist:'Navaan Sandhu & JayB Singh',year:2026,youtubeIds:['qs61wmCGBhs','n00AIBEXP3s'],lang:'punjabi'},
{title:'Bairan',artist:'Banjaare',year:2026,youtubeIds:['oafxkMv4xnc'],lang:'punjabi'},
{title:'Barsaat',artist:'Banjaare & Roni',year:2026,youtubeIds:['ebZj_nrmH-c'],lang:'punjabi'},
/* Dior: backup ID is the Kahlon Records upload (oEmbed-verified). */
{title:'Dior',artist:'Harf Cheema ft. Gurlez Akhtar',year:2026,youtubeIds:['gTpH5AOslOE','ERdKnGW70aQ'],lang:'punjabi'},
{title:'Gidha',artist:'R Nait ft. Himanshi Khurana',year:2026,youtubeIds:['UTYnBUaGTcU','zIl9eLe0P9I'],lang:'punjabi'},
/* 5-7 Kille: official Jass Records video is primary — the old primary is embed-restricted (oEmbed 403). */
{title:'5-7 Kille',artist:'Amar Sehmbi',year:2026,youtubeIds:['VfwOhLVsrgY'],lang:'punjabi'},
{title:'Rang',artist:'Joban Sandhu & Jassi X',year:2026,youtubeIds:['vuy4pXAMyms'],lang:'punjabi'},
{title:'Kawan Di Daar',artist:'A Kay',year:2026,youtubeIds:['2kR6odmFxKU'],lang:'punjabi'},
{title:'Sawaal Puchdi',artist:'Yo Yo Honey Singh ft. Bohemia',year:2026,youtubeIds:['472GGh5D_h8'],lang:'punjabi'},
/* ── Hindi 2026 ── */
{title:'Jaiye Sajana',artist:'Shashwat Sachdev, Jasmine Sandlas & Satinder Sartaaj (Dhurandhar The Revenge)',year:2026,youtubeIds:['F2m4HPLvj-4','WK_PlcL8Tzo'],lang:'hindi'},
{title:'Jaan Se Guzarte Hain',artist:'Shashwat Sachdev & Khan Saab (Dhurandhar The Revenge)',year:2026,youtubeIds:['TkLkStcQ0o4'],lang:'hindi'},
{title:'Aari Aari',artist:'Shashwat Sachdev, Bombay Rockers (Dhurandhar: The Revenge)',year:2026,youtubeIds:['dESIGVxSSCE','f-9IaGAlgEA'],lang:'hindi'},
{title:'Main Aur Tu',artist:'Jasmine Sandlas, Reble (Dhurandhar: The Revenge)',year:2026,youtubeIds:['-dt1VE_9EJI'],lang:'hindi'},
{title:'Tera Mera Rishta Continues',artist:'Mithoon, Saaj Bhatt, Mustafa Zahid (Awarapan 2)',year:2026,youtubeIds:['qi9_5Wu1odU'],lang:'hindi'},
{title:'Toh Phir Aao (Dobara)',artist:'Mithoon, Pritam, Mustafa Zahid (Awarapan 2)',year:2026,youtubeIds:['rkV7--wYUJ8'],lang:'hindi'},
{title:'Darmiyaan',artist:'Rekha Bhardwaj, Raghav Kaushik, Amrita Saluja (Musafir Cafe)',year:2026,youtubeIds:['y9mJNwPly44','eMXZiJ_bX-k'],lang:'hindi'},
{title:'Kaafi Hai Na',artist:'Garvit-Priyansh ft. Jonita Gandhi (Musafir Cafe)',year:2026,youtubeIds:['Gigpglm3XNw','n90OVV69e9A'],lang:'hindi'},
{title:'Mashooqa',artist:'Pritam, Mahmood, Raghav Chaitanya, Ruaa Kayy (Cocktail 2)',year:2026,youtubeIds:['7jMzMXpSOjs'],lang:'hindi'},
{title:'KALYANI (Remix)',artist:'ARJN, KDS, FIFTY4 ft. Shreya Ghoshal',year:2026,youtubeIds:['xvT1jH8B9AM'],lang:'hindi'},
{title:'Boom Shaka',artist:'KR$NA & Dhanda Nyoliwala',year:2026,youtubeIds:['cL0KKSPjZf8'],lang:'hindi'},
{title:'Taare',artist:'Farak ft. 10A & Saswat Balan',year:2026,youtubeIds:['085XkY0OKTU'],lang:'hindi'},
{title:'Not Guilty',artist:'Dhanda Nyoliwala',year:2026,youtubeIds:['E7ergOnpO1Q'],lang:'hindi'},
{title:'Ghar Kab Aaoge',artist:'Sonu Nigam, Arijit Singh, Diljit Dosanjh (Border 2)',year:2026,youtubeIds:['oodOj8jx8ds'],lang:'hindi'},
{title:'Ishq Da Chehra',artist:'Diljit Dosanjh, Sachet-Parampara (Border 2)',year:2026,youtubeIds:['vdOosB8iLiM'],lang:'hindi'},
{title:'Tu Hi Disda',artist:'Arijit Singh, Nikhita Gandhi (Bhooth Bangla)',year:2026,youtubeIds:['4jO8EWJutfE'],lang:'hindi'},
{title:'Tabaahi',artist:'Vishal Mishra',year:2026,youtubeIds:['h1kihH0l8iQ'],lang:'hindi'},
{title:'Yeh Awarapan',artist:'Arijit Singh',year:2026,youtubeIds:['I9tX-lFUTrw'],lang:'hindi'},
{title:'Khwaab Dekhoon',artist:'Arijit Singh, Tarannum Malik',year:2026,youtubeIds:['ujaFXF381Og'],lang:'hindi'},
];
