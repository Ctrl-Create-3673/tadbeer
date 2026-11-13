# Tadbeer (تدبير)

Plan with Purpose. Organise with Clarity. Hijri calendar, tasks, events and notes.

A personal planner built around the **Mumineen (Fatimid tabular) Hijri calendar**: dashboard, calendar (month / year / week / day),
tasks, events, notes, reminders, monthly & yearly planners, and an A4-landscape printable PDF generator.
Everything runs in the browser — no account, no backend. Data is stored on your device (IndexedDB).

React · TypeScript · Vite · Tailwind CSS 4 · lucide-react · idb · pdf-lib + HarfBuzz (WASM).

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (calendar engine, PDF export)
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build locally
```

Node 20+ is recommended.

## Fonts (read this first)

Only the font files in `src/assets/fonts/` are used — no Google Fonts, no CDN. Current files:
`Kanz-al-Marjaan.ttf`, `Kanz-al-Yaqoot.ttf`, `KanzalLulu-Regular.ttf`, `Saifee.ttf`, `me_quran-Regular.ttf`.

* **Config:** `src/styles/fonts.config.ts` lists every font, what it covers, and the default role assignment.
* **Roles** (Settings → Fonts): interface/English, Arabic names, Hijri numerals, and **writing** (the font used when you type in
  notes, tasks, events, planner cells and for your text in the PDF). Pick any supplied font for any role.
* **Coverage:** `me_quran` has no English letters or Western digits; the others cover English, digits, Arabic and Arabic-Indic digits.
  In the app, a missing glyph falls back to the browser's generic sans-serif. In the **PDF**, missing characters are left out and
  **reported** after export — no other font is ever substituted.
* **Git:** the font files are committed with the project, so GitHub Pages builds include them. Make sure each font's licence allows
  public redistribution; if not, add `src/assets/fonts/*` to `.gitignore` and remove them from the repo before making it public.
  To add a font: drop the file in the folder and add one entry to `FONTS`.

## Calendar accuracy

Dates use the Mumineen calendar's arithmetic rules (30-year cycle, kabisa years 2, 5, 8, 10, 13, 16, 19, 21, 24, 27, 29; odd months 30 days,
even months 29, Zilhaj 30 in kabisa years), ported from [mumineen_calendar_js](https://github.com/mygulamali/mumineen_calendar_js) (MIT).
**This is not Umm al-Qura** and can differ from it by a day or more.

* The port works on integer Julian day numbers and ISO dates (no timezone/DST drift) and is checked day-by-day against the original
  code for 1900–2100, plus an anchor from the supplied planner PDF: **1 Moharram 1448 = Monday 15 Jun 2026**.
* The original returns "day 0 of month 0" on the last day of each 30-year cycle; the port returns the correct 30 Zilhaj.
* **Corrections:** when an announced month start differs, use *Correct start* on the calendar header (or Settings → Hijri date
  correction). A correction is "month M begins on date X"; lengths must stay 29/30 days, so neighbouring months may need correcting too.
  Corrected months are labelled **Confirmed**, everything else **Calculated**.
* Arabic month names are a direct rendering of the Mumineen English names — please proof-read `src/services/hijri/names.ts`.
* No events, occasions or dates are pre-loaded. All lists start empty.

## Google sign-in and email reminders (optional)

A static site cannot send email by itself, so the app uses **Google Calendar**: after you sign in with Google, **Sync** writes your
upcoming tasks, events and standalone reminders into *your* primary Google Calendar with **email + popup reminders**. Google sends the
emails to your Google address, even when the app is closed. Each person who uses the app signs in with their own Google account.

* Tasks/all-day events without a time are placed at the *default time* (Settings, default 09:00) on their date; tasks use their own
  reminder time when set; events use their reminder lead time (default 10 min before, or at the default time for all-day).
* Only upcoming, not-completed items are kept in Google Calendar. The app tags what it creates and only ever changes those events.
* The sign-in token lives in memory for about an hour (no backend to refresh it). After that, press *Sign in* again to sync; items
  already in your calendar keep emailing. With *auto-sync* on, changes sync a few seconds after you make them while signed in.
* Reminders that repeat by **Hijri** date sync as their next occurrence only (Google cannot repeat by Hijri date).

**One-time setup (free, ~2 minutes) — needed once per deployment:**

1. <https://console.cloud.google.com/> → create a project → *APIs & Services → Library* → enable **Google Calendar API**.
2. *OAuth consent screen* → External → fill in the app name and your email → add the Calendar scope
   `.../auth/calendar.events` → add every person who will use it under **Test users** (up to 100 while the app is unverified; Google shows
   an "unverified app" warning until you submit it for verification).
3. *Credentials → Create credentials → OAuth client ID → Web application*. Under **Authorized JavaScript origins** add
   `http://localhost:5173` and your site, e.g. `https://<your-user>.github.io` (origin only, no path).
4. Copy the **Client ID** (it is public, not a secret) into *Settings → Google account → Client ID*, or set it at build time with
   `VITE_GOOGLE_CLIENT_ID=… npm run build` (for GitHub Actions: a repository *variable* exposed as that env var).

Google's sign-in script (`accounts.google.com/gsi/client`) is loaded only when you press *Sign in*. No Client Secret is used or needed.

## Reminders and notifications

Times are stored as wall-clock time in the timezone chosen in Settings. A browser can only notify while the app is open
(there is no server to wake it), so a reminder that comes due while the app is closed shows as **Due now** next time you open it.
Background tabs may check up to a minute late; some mobile browsers only support in-app alerts. Recurrence: daily, weekly, monthly,
yearly (by Gregorian **or Hijri** date) or every N days. Completing a recurring reminder moves it to its next occurrence.

## PDF export

Print → *Printable calendar PDF*: one month or the full Hijri year, blank or with your tasks / events, A4 landscape, English + Arabic
names, Arabic Hijri numerals, Gregorian mapping, footer with page numbers, and a final "Important Notes, Events & Reminders" page.
Text is shaped with HarfBuzz (WASM), so Arabic joins and ligatures are correct, and the full fonts are embedded. Limitation: the PDF text
is not searchable/copyable because glyphs are written directly.

## Backups

Settings → Your data: export everything as JSON, import/restore (shows how many items are new / identical / differing first; by
default existing items are never overwritten, and replacing makes a safety copy), or clear all data (with confirmation).
Browsers can delete site data — export backups regularly.

## Project layout

```
src/
  components/  pages/  hooks/  types/  utils/  styles/ (index.css, fonts.config.ts)
  features/    calendar, tasks, events, notes, reminders, planner, pdf-export
  services/    hijri (engine + tests), storage (IndexedDB, backup, settings), notifications (scheduler)
  assets/      fonts/  images/
```

## Deploy to GitHub Pages

The build is static with relative asset paths (`base: './'`) and hash routing, so it works under any repository name.
`.github/workflows/deploy.yml` builds and publishes on every push to `main`.

```bash
git init -b main
git add .
git commit -m "Tadbeer"
git remote add origin https://github.com/<your-user>/<your-repo>.git
git push -u origin main
```

Then on GitHub: **Settings → Pages → Source: GitHub Actions**. (Remember the fonts note above.)

## Known limitations

No task attachments. Tags are plain text on each item (no tag manager). Categories are per type (task / event / note). The first-day-of-week
and numeral settings apply everywhere; the Arabic UI language translates names and flips layout direction, but interface labels such as
button text remain English.

## Licence

Third-party code and notices: see `THIRD-PARTY-NOTICES.md`. Choose and add a licence for this project's own code before publishing.
