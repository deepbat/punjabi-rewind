/* Punjabi Rewind — 50 All-Time Punjabi Hits (Chamkila to Today)
   HYBRID v500: youtubeIds + optional spotifyId. If YouTube blocked (101/150), player auto-switches to Spotify/Invidious.
   These are the songs that were on everyone's mouth — from akharas to weddings to stadiums.
   From Kuldeep Manak & Chamkila (70s/80s) → Gurdas Maan, Bindrakhia, Daler Mehndi (90s) → Jazzy B, Babbu Maan (2000s) → Honey Singh, Diljit, Sidhu Moose Wala → AP Dhillon, Shubh, Karan Aujla (2020s).
   Every entry verified with a working YouTube ID. Sorted chronologically for the rewind journey. */
window.SONGS = [
/* ── Golden Era — Folk Legends (1976-1990) ── */
{title:'Tere Tille Ton',artist:'Kuldeep Manak',year:1976,youtubeIds:['ktt5PcTKcKw'],lang:'punjabi'},
{title:'Jatt Di Dushmani',artist:'Amar Singh Chamkila',year:1984,youtubeIds:['WkzdPGhUAM0'],lang:'punjabi'},
{title:'Pehle Lalkare Naal',artist:'Amar Singh Chamkila & Amarjot',year:1985,youtubeIds:['NFAbZ3nqIiE'],lang:'punjabi'},
{title:'Challa',artist:'Gurdas Maan',year:1986,youtubeIds:['MWLiiZN-o2w'],lang:'punjabi'},
{title:'Tutak Tutak Tutiya',artist:'Malkit Singh',year:1990,youtubeIds:['qF1APiiaIaY'],lang:'punjabi'},
/* ── 90s — The Bhangra Explosion ── */
{title:'Ek Charkha Gali De Vich',artist:'Sardool Sikander',year:1991,youtubeIds:['QvyqEiCTrhA'],lang:'punjabi'},
{title:'Dupatta Tera Nau Rang Da',artist:'Surjit Bindrakhia',year:1992,youtubeIds:['0JgIYnjj0sk'],lang:'punjabi'},
{title:'Nit Khair Manga',artist:'Hans Raj Hans',year:1992,youtubeIds:['KlzePMcScGU'],lang:'punjabi'},
{title:'Gur Nalo Ishq Mitha',artist:'Malkit Singh & Bally Sagoo',year:1994,youtubeIds:['pkTUqeC_-wk'],lang:'punjabi'},
{title:'Bas Kar Bas Kar Sohniye',artist:'Surjit Bindrakhia',year:1995,youtubeIds:['ahCmYMBTbQY'],lang:'punjabi'},
{title:'Ho Jayegi Balle Balle',artist:'Daler Mehndi',year:1997,youtubeIds:['KTE6S-Pmhpw'],lang:'punjabi'},
{title:'Apna Punjab Hove',artist:'Gurdas Maan',year:1997,youtubeIds:['B4m4ndLXR7E'],lang:'punjabi'},
{title:'Mundian To Bach Ke',artist:'Panjabi MC ft. Labh Janjua',year:1998,youtubeIds:['x9WO2ieJMYk'],lang:'punjabi'},
{title:'Tunak Tunak Tun',artist:'Daler Mehndi',year:1998,youtubeIds:['eZ2PtEx9-ls'],lang:'punjabi'},
{title:'Oye Hoye',artist:'Harbhajan Mann',year:1999,youtubeIds:['Bsc3_gm74pQ'],lang:'punjabi'},
/* ── 2000s — Desi Hip-Hop & Melody ── */
{title:'Dil Luteya',artist:'Jazzy B ft. Apache Indian',year:2001,youtubeIds:['vVkPlzc5nAA'],lang:'punjabi'},
{title:'Mitran Di Chhatri',artist:'Babbu Maan',year:2002,youtubeIds:['MezRyC_-HuY'],lang:'punjabi'},
{title:'Sohni Lagdi',artist:'Miss Pooja ft. Preet Harpal',year:2009,youtubeIds:['bgYeVC8MWZ8'],lang:'punjabi'},
{title:'Sai',artist:'Satinder Sartaaj',year:2010,youtubeIds:['og7LGtNjmvE'],lang:'punjabi'},
{title:'Angreji Beat',artist:'Yo Yo Honey Singh ft. Gippy Grewal',year:2011,youtubeIds:['ZTgvgmhC1gQ'],lang:'punjabi'},
{title:'Yeah Baby',artist:'Garry Sandhu',year:2011,youtubeIds:['G7RW-KVDeEo'],lang:'punjabi'},
{title:'Brown Rang',artist:'Yo Yo Honey Singh',year:2012,youtubeIds:['iX4qQlm-0NY'],lang:'punjabi'},
{title:'Car Nachdi',artist:'Gippy Grewal ft. Bohemia',year:2012,youtubeIds:['aIeTcUBTd04'],lang:'punjabi'},
{title:'Proper Patola',artist:'Diljit Dosanjh ft. Badshah',year:2013,youtubeIds:['GVhmynWOPoM'],lang:'punjabi'},
{title:'Blue Eyes',artist:'Yo Yo Honey Singh',year:2013,youtubeIds:['NbyHNASFi6U'],lang:'punjabi'},
{title:'Patiala Peg',artist:'Diljit Dosanjh',year:2014,youtubeIds:['xB9-dsTC_0U'],lang:'punjabi'},
/* ── 2015-2017 — New Wave Anthems ── */
{title:'5 Taara',artist:'Diljit Dosanjh',year:2015,youtubeIds:['oK8I_eg-p_8'],lang:'punjabi'},
{title:'Jean',artist:'Ranjit Bawa',year:2015,youtubeIds:['kEELvkhQPk4'],lang:'punjabi'},
{title:'Do You Know',artist:'Diljit Dosanjh',year:2016,youtubeIds:['P-DhwN87JDY'],lang:'punjabi'},
{title:'3 Peg',artist:'Sharry Mann',year:2016,youtubeIds:['hzTg4zPBtDU'],lang:'punjabi'},
{title:'Badnam',artist:'Mankirt Aulakh',year:2016,youtubeIds:['pXPHSaj8qSw'],lang:'punjabi'},
{title:'High Rated Gabru',artist:'Guru Randhawa',year:2017,youtubeIds:['hjWf8A0YNSE'],lang:'punjabi'},
{title:'Lahore',artist:'Guru Randhawa',year:2017,youtubeIds:['dZ0fwJojhrs'],lang:'punjabi'},
{title:'Naah',artist:'Harrdy Sandhu',year:2017,youtubeIds:['8qs2dZO6wcc'],lang:'punjabi'},
{title:'Qismat',artist:'Ammy Virk',year:2017,youtubeIds:['9xVp8m0fJSg'],lang:'punjabi'},
{title:'Gaal Ni Kadni',artist:'Parmish Verma',year:2017,youtubeIds:['U65TWIP3mpQ'],lang:'punjabi'},
{title:'Suit',artist:'Nimrat Khaira ft. Mankirt Aulakh',year:2017,youtubeIds:['15KWUc1aLEU'],lang:'punjabi'},
{title:'So High',artist:'Sidhu Moose Wala',year:2017,youtubeIds:['GgmFC8y8q3k'],lang:'punjabi'},
/* ── 2018-2023 — Global Punjabi Era ── */
{title:"Don't Look",artist:'Karan Aujla',year:2018,youtubeIds:['6Pd-3nvYDRk'],lang:'punjabi'},
{title:'Kya Baat Ay',artist:'Harrdy Sandhu',year:2018,youtubeIds:['G0Hx6uN2AJE'],lang:'punjabi'},
{title:'Daaru Wargi',artist:'Guru Randhawa',year:2019,youtubeIds:['VXVmtHcf2Dg'],lang:'punjabi'},
{title:'Legend',artist:'Sidhu Moose Wala',year:2019,youtubeIds:['YZAFd9o3RYQ'],lang:'punjabi'},
{title:'Lehenga',artist:'Jass Manak',year:2019,youtubeIds:['RKioDWlajvo'],lang:'punjabi'},
{title:'Brown Munde',artist:'AP Dhillon ft. Gurinder Gill',year:2020,youtubeIds:['VNs_cCtdbPc'],lang:'punjabi'},
{title:'Excuses',artist:'AP Dhillon ft. Gurinder Gill',year:2020,youtubeIds:['vX2cDW8LUWk'],lang:'punjabi'},
{title:'Titliaan',artist:'Afsana Khan ft. Harrdy Sandhu',year:2020,youtubeIds:['YPohR_9v6HA'],lang:'punjabi'},
{title:'295',artist:'Sidhu Moose Wala',year:2021,youtubeIds:['abDV9-5Mb-w'],lang:'punjabi'},
{title:'Bijlee Bijlee',artist:'Harrdy Sandhu',year:2021,youtubeIds:['jtxT4cWEdbA'],lang:'punjabi'},
{title:'We Rollin',artist:'Shubh',year:2023,youtubeIds:['hV8EGTjzD2s'],lang:'punjabi'},
{title:'Softly',artist:'Karan Aujla ft. Ikky',year:2023,youtubeIds:['cWMxCE2HTag'],lang:'punjabi'},
];
