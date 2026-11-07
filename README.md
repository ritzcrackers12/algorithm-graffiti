# Algorithm Graffiti

Gallery installation for NYU IMA (opens November 16). An iPad shows a Windows XP–style desktop with
four objects (Article, Reel, Song, Game). A visitor scans the QR note; their phone is the remote.
One visitor at a time, with a queue. There is no turn timer. A turn ends when they press END SESSION,
close the page, or sit idle for 60 seconds.

**Wall label (draft, rewrite as you like):** This station records device type, the controls you move,
and the ratings or choices you make. The record is anonymous. It is deleted when the session ends.

| Page | Address | Who uses it |
|---|---|---|
| Library (iPad) | https://ritzcrackers12.github.io/algorithm-graffiti/#/library | The iPad on the wall |
| Controller (phone) | https://ritzcrackers12.github.io/algorithm-graffiti/#/controller | Visitors (via QR code) |
| Staff console | https://ritzcrackers12.github.io/algorithm-graffiti/#/admin | Staff (needs passcode) |

See `PROGRESS.md` for status and `PROJECT_SPEC.md` for the Version 2 brief.

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
| Placeholder ads | `public/content/ads.csv` and `public/assets/ads/` |
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
| `icon-article.png`, `icon-reel.png`, `icon-song.png`, `icon-game.png` | 512 × 512, transparent | iPad desktop icons and phone picker |
| `icon-<name>-altered.png` (optional, e.g. `icon-article-altered.png`) | 512 × 512 | iPad icon after it's been altered |
| `bg-article.jpg`, `bg-reel.jpg`, `bg-song.jpg`, `bg-game.jpg` | 1170 × 2532 | Phone background for that object's controls |

Keep big media (video, audio) **out** of this repo. Later sessions will put it in Supabase Storage.
A checklist of file names is also in `public/assets/README.txt`.

### Articles: `public/content/articles/` (Ball Street Journal)

The iPad shows each story in a Wall Street Journal–style page titled **The Ball Street Journal**.
The phone lists stories **by title** on a chooser screen. Add as many as you like:

1. Write the article as a Markdown file, e.g. `my-story.md`. First line is `# Headline`.
   Optional byline: `*By Name, Ball Street Journal*`. Then paragraphs separated by a blank line.
2. Add it to `index.json`: `{ "id": "my-story", "title": "The Headline Visitors Will See" }`.
   The `id` must match the file name without `.md`.
3. See `public/content/articles/README.txt`.

### Ads: `public/content/ads.csv`

Placeholder rows (`PLACEHOLDER BRAND 1` … `6`) are in place so scoring and pop-ups can be tested.
Replace them later with fictional brands. Columns:

| Column | Meaning |
|---|---|
| `id` | Short id, e.g. `ph-1`. Must be unique. |
| `category` | Bucket the scorer matches (wellness, finance, security, civic, education, lifestyle). |
| `brand` | Brand name shown on the ad. |
| `product` | Product name. |
| `tagline` | Default headline before personalization. |
| `image` | File under `public/assets/ads/` (example: `ads/ph-1.svg`). |
| `voice_script` | Spoken line for the later radio ad. |
| `target_rules` | Conditions on the visitor profile, combined with `AND` / `OR`. Examples: `income<=60k`, `mood=anxious`, `lean>=1`, `lean<=-1`, `age=18-24`. |

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

- `REPLICATE_PROXY_TOKEN`: NYU class-proxy token (optional if you paste it on `#/admin`).
- `REPLICATE_API_TOKEN`: direct Replicate key, only used if staff switch the mode to **direct**.
- `ADMIN_PASSCODE`: the staff passcode for the live site. This repo is public, so don't rely on the
  default in `config.ts`.

Live AI goes through the NYU proxy by default (`REPLICATE_MODE = proxy`). Paste a fresh token on
`#/admin` (tokens can expire about every hour). If a call fails, visitors still see the pre-made
article. Repeats of the same article knobs are served from cache.

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
3. **Phone:** scan the QR note in the iPad's bottom-left corner with the camera. You get control.
   There is no countdown.
4. **Second phone:** scan too. It should say "QUEUE POSITION: 1. YOU ARE NEXT." When the first
   phone taps END SESSION (or stops touching for 60 seconds), the second phone takes over and the
   iPad resets to the originals.
5. **Staff:** open `#/admin` on any device and enter the passcode. You can reset, skip a visitor,
   clear the queue, and switch mock mode.

## Tests

```bash
npm run test:sql        # queue, cap, rate limit and permission rules, against an in-memory Postgres
npm run test:replicate  # tiny AI wrapper check (embed always; text only if a token is saved)
npm run build           # type-check + production build
```
