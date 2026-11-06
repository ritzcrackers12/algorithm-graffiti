# Algorithm Graffiti

**WHO TUNES YOUR REALITY?**: a gallery installation for NYU IMA (opens November 16).

An iPad shows a Windows XP–style desktop with five media objects. A visitor scans the QR note on the
iPad's screen, and their phone becomes the remote: one visitor at a time, with a queue. They twist
knobs and sliders, and the object on the iPad gets rewritten or restyled.

| Page | Address | Who uses it |
|---|---|---|
| Library (iPad) | https://ritzcrackers12.github.io/algorithm-graffiti/#/library | The iPad on the wall |
| Controller (phone) | https://ritzcrackers12.github.io/algorithm-graffiti/#/controller | Visitors (via QR code) |
| Staff console | https://ritzcrackers12.github.io/algorithm-graffiti/#/admin | Staff (needs passcode) |

Session 1 built: queue, admin, iPad desktop, phone controller, **Article** and **Website** objects.
Reel, Image and Song show as "offline" until later sessions. See `PROGRESS.md` for status, and
`PROJECT_SPEC.md` for the full brief.

---

## Run it on your computer

You need [Node.js](https://nodejs.org) (version 22 or newer). In Terminal, from this folder:

```bash
npm install
npm run dev
```

Then open http://localhost:5173/algorithm-graffiti/ (the exact port is printed in Terminal).

**Local mode.** Until Supabase is connected, everything runs in *local mode*: the iPad and phones
are tabs in the same browser, talking through the browser's storage. Open one tab at `#/library` and
two or more tabs at `#/controller`. Each tab counts as a different visitor. Add `?local` to any
address to force local mode even after Supabase is connected, e.g.
`http://localhost:5173/algorithm-graffiti/?local#/library`.

## Where things live

| What | Where |
|---|---|
| **All settings** (timers, mock mode, daily cap, passcode, AI model) | `src/shared/config.ts` |
| Articles | `public/content/articles/` |
| Website that gets restyled | `public/content/website/base/` |
| Your artwork (wallpaper, icons, backgrounds) | `public/assets/` |
| Database logic (queue, cap, rate limit) | `supabase/migrations/` |
| Server code (AI calls, staff actions) | `supabase/functions/` |

### Your artwork: `public/assets/`

Drop files with **exactly these names** into `public/assets/`. Anything missing uses built-in
placeholder art, so you can add them one at a time.

| File name | Size | Shown on |
|---|---|---|
| `wallpaper.jpg` | 2732 × 2048 | iPad desktop background (no Microsoft Bliss) |
| `start-button.png` | about 220 × 64, transparent | iPad taskbar (no Windows logo) |
| `icon-reel.png`, `icon-website.png`, `icon-article.png`, `icon-image.png`, `icon-song.png` | 512 × 512, transparent | iPad desktop icons and phone picker |
| `icon-<name>-altered.png` (optional, e.g. `icon-article-altered.png`) | 512 × 512 | iPad icon after it's been altered |
| `bg-reel.jpg`, `bg-website.jpg`, `bg-article.jpg`, `bg-image.jpg`, `bg-song.jpg` | 1170 × 2532 | Phone background for that object's controls |

Keep big media (video, audio) **out** of this repo. Later sessions will put it in Supabase Storage.

### Articles: `public/content/articles/`

1. Write the article as a plain text file, e.g. `my-story.md`. The first line is the headline,
   starting with `# `. Then the paragraphs, separated by a blank line.
2. Add it to `index.json`, e.g.
   `[{"id": "my-story", "title": "My Headline"}]`. The `id` must match the file name without `.md`.
3. You can list several. The phone then shows a document picker. Delete the `placeholder` entry
   when your real article is in.

### Website: `public/content/website/base/`

`index.html` + `style.css` is the page that gets restyled. To swap in your own design, keep two
rules:

- Text the AI may rewrite carries `data-editable="some-id"`, e.g. `<h1 data-editable="hero-title">`.
- Colors, fonts and spacing come from CSS variables on `:root` (`--bg`, `--fg`, `--accent`,
  `--accent-2`, `--panel`, `--border`, `--font-body`, `--font-head`, `--radius`, `--spacing`,
  `--shadow`). Restyles only change those variables.

The server only accepts CSS variables from that list, and only the fonts listed in
`src/shared/website.ts`.

## Deploying

- **Website:** every push to `main` rebuilds and publishes to GitHub Pages automatically (see the
  Actions tab on GitHub; takes about a minute). A running iPad picks up the new version on its
  own within a minute, when nobody is using it.
- **Database changes:** `npm run deploy:db`
- **Server functions:** `npm run deploy:functions`

The site reads two GitHub repository *variables* (Settings → Secrets and variables → Actions →
Variables): `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. If they're missing, the live site runs
in local mode (each device on its own, so phones can't control the iPad).

### Secrets: never in this repo

These live **only** in Supabase (Dashboard → Edge Functions → Secrets):

- `REPLICATE_API_TOKEN`: the AI key. Only the server uses it.
- `ADMIN_PASSCODE`: the staff passcode for the live site. This repo is public, so don't rely on the
  default in `config.ts`.

The phone sends only object IDs and control values. Every AI prompt is built on the server from
fixed templates.

## Mock mode and AI

`MOCK_MODE` is **on** by default: rewrites and restyles come from built-in rules, with no AI
and no cost. Turn real AI on or off from the staff console (`#/admin`) without redeploying.

With real AI on, the following limits are enforced on the server:

- No more than `DAILY_GENERATION_CAP` (200) AI calls per day (New York time).
- At most one generation every 5 seconds.
- If the AI fails or takes over 30 seconds, the iPad quietly shows the built-in version instead.
  Visitors never see an error screen.

## Testing on real devices

1. Make sure the GitHub Actions run is green and the Supabase variables are set (see `PROGRESS.md`).
2. **iPad:** open Safari to the Library address above. Tap Share → **Add to Home Screen**, then open
   it from the home screen (full screen, no browser bars). Tap **TAP TO BEGIN** (this turns on sound
   and keeps the screen awake). In Settings → Display & Brightness, set Auto-Lock to Never. For the
   gallery, also use Settings → Accessibility → **Guided Access**.
3. **Phone:** scan the QR note in the iPad's bottom-left corner with the camera. You get control,
   and a 1:30 timer starts.
4. **Second phone:** scan too. It should say "QUEUE POSITION: 1. YOU ARE NEXT." When the first
   phone taps END SESSION (or stops touching for 20 seconds), the second phone takes over and the
   iPad resets to the originals.
5. **Staff:** open `#/admin` on any device and enter the passcode. You can reset, skip a visitor,
   clear the queue, and switch mock mode.

## Tests

```bash
npm run test:sql   # queue, cap, rate limit and permission rules, against an in-memory Postgres
npm run build      # type-check + production build
```
