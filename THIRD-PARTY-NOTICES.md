# Third-party notices

## Mumineen calendar logic — MIT
`src/services/hijri/engine.ts` is a TypeScript port of the date arithmetic in
[mygulamali/mumineen_calendar_js](https://github.com/mygulamali/mumineen_calendar_js)
(`hijri_date.js`), © 2014–2019 Murtaza Gulamali, MIT licence. The original file is kept unmodified at
`src/services/hijri/reference-hijri_date.js` and is used only by the unit tests to check the port.
Full licence text: `LICENSE-THIRD-PARTY-mumineen_calendar_js.txt`.

## npm dependencies (all MIT unless noted)
react, react-dom, react-router-dom, lucide-react (ISC), idb (ISC), pdf-lib, @pdf-lib/fontkit,
harfbuzzjs (HarfBuzz text shaper compiled to WebAssembly), tailwindcss, vite, vitest.

## Google services
Optional sign-in uses Google Identity Services (loaded from accounts.google.com on demand) and the Google Calendar REST API, subject to Google's terms.

## Fonts
The fonts in `src/assets/fonts/` were supplied by the project owner and are **not** covered by this repository's
licence. Check each font's licence before committing or redistributing it (see README → Fonts).
