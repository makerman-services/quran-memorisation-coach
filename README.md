# Islamic Beginners Introduction Guide — private preview

A calm Quran memorisation coach for people who are new to Islam. This first preview is the intro and the coach only. Learn a few verses at a time, mark them remembered when you are ready, and review earlier ones together every few sections.

This preview is **not public, not listed, and not priced**. Do not deploy it, do not push it to a public repository, and do not add a shop or a buy button.

This preview bundles the official Tanzil Quran Text (Simple, Version 1.1) and the official ClearQuran Allah Edition English by Talal Itani, each taken from that project's official download and left unaltered. Transliteration is loaded only from `data/transliteration-verses.json`. No recitation audio is included. This app does not give religious rulings.

## What’s in the folder

- `index.html` — the five screens: Welcome, Today's verses, Review quiz, Progress, Saved
- `style.css` — Warm paper look, system fonts for English, self-hosted Scheherazade New and Amiri for Arabic
- `app.js` — spaced-repetition scheduler, localStorage, and the UI
- `data/curriculum.json` — example verse groups (titles and verse references only)
- `data/transliteration-verses.json` — public transliteration verse lines
- `tanzil/quran-simple.txt` — official Tanzil Simple 1.1 Arabic, unaltered
- `clearquran/clearquran-allah-edition.txt` — official ClearQuran Allah Edition English, unaltered
- `fonts/` — Scheherazade New Regular with `OFL.txt`, and `fonts/amiri/` Amiri Regular with its own `OFL.txt`
- `LICENCES/` — Tanzil and ClearQuran notices
- `tests/test_islamic_guide.js` — scheduler, combined reviews, persistence, verbatim credits and disclaimer, no wudu/prayer/duas screens, and no runtime network requests except credit links

Progress, saved items and settings stay in this browser’s `localStorage` only. There is no account and no server for user data.

## How to run the preview

From this folder, start a local static server on a free port (do not use 8892, 8877, 8787, 8899, 8888 or 8901) and bind it only to this machine:

    python3 -m http.server 8905 --bind 127.0.0.1

Then open `index.html` on a phone or in a phone-width window.

## Tests

    node tests/test_islamic_guide.js

## Look and fonts

Warm paper: background `#f6efe4`, text `#2b2620`, accent `#d9773a`. System fonts for English. Arabic uses self-hosted Scheherazade New, with Amiri as a fallback. No off-site fonts, no analytics, no pixels, no CDNs. Visuals are drawn with CSS and a small SVG favicon. There are no depictions of prophets or of people praying.

## Sources and fonts in this preview

- **Arabic:** Tanzil Quran Text (Simple, Version 1.1), used verbatim. Credit and a link to [tanzil.net](https://tanzil.net) are in About and sources, and beside the verses. The official copyright notice is in `LICENCES/TANZIL-QURAN-TEXT.txt` and at the end of `tanzil/quran-simple.txt`.
- **English:** Translation by Talal Itani, [ClearQuran.com](https://clearquran.com), Allah Edition, wording unaltered, taken from the official ClearQuran download (not from Tanzil translation files). Notice in `LICENCES/CLEARQURAN.txt`.
- **Transliteration:** only from `data/transliteration-verses.json`. Transliteration is approximate. Learn the Arabic pronunciation from a teacher.
- **Fonts:** Scheherazade New and Amiri, each self-hosted, SIL Open Font License 1.1, each with `OFL.txt`. No Google Fonts and no font CDN.
- **Not included:** recitation audio; Tanzil translation files; any other English translation; wudu or prayer step screens; and other screens held for a later reviewer.

The app does not make runtime network requests. Credit links in About and sources, and beside the verses, are ordinary links that open only if the reader taps them.

## Before any public release

This is not a pass to list the app, to add the held prayer-step or later helper screens, or to go live. Mal's yes still goes through Supervisor before release.
