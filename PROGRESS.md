# PROGRESS: Algorithm Graffiti

_Last updated: Nov 6, 2026 (Session 1 live on Supabase, mock mode)_

## Done (Session 1)
- **Project:** own folder and public repo, https://github.com/ritzcrackers12/algorithm-graffiti. Auto-deploys to
  https://ritzcrackers12.github.io/algorithm-graffiti/ on every push (GitHub Actions).
- **Settings in one place:** `src/shared/config.ts`.
- **Queue (one visitor at a time):** 90s turns, 20s idle handoff, vanished phones dropped after 12s, waiting phones
  kept for 3 min even with a locked screen. Covered by SQL tests (`npm run test:sql`, all passing).
- **Staff console `#/admin`:** passcode, live status, today's generation counts, reset / skip / clear queue /
  mock on-off.
- **iPad `#/library`:** tap-to-begin (sound, wake lock, fullscreen), XP desktop, 5 icons (idle, click and
  "altered" glitch animations), XP windows, green progress dialog with countdown, Original/Altered tabs, QR sticky
  note, taskbar with connection status, auto-update when a new version is deployed.
- **Phone `#/controller`:** queue screen, MM:SS turn timer, object picker (Reel/Image/Song marked offline),
  Home, Original/Altered toggle, controls lock while processing, idle warning, End Session, haptics.
- **Article:** political lean slider, reader level and sensationalism knobs, connotation switch. Rewrites the
  article; the iPad types out the result.
- **Website:** era knob (1996–2026), 6 invented country models or a typed custom one, mood slider. Restyles
  the colors and fonts and rewrites the text of the placeholder "Orbitwell" site.
- **Supabase connected** (project `nkmeiqwhwuuysdahyzju`, region us-west-2): database pushed, both functions deployed,
  GitHub variables set, live site rebuilt. Verified live: phone takes control, mock rewrite reaches the iPad.
- **Server:** `generate` and `admin` Edge Functions. They enforce the daily cap
  (200), the 5s rate limit, the 30s timeout with fallback, and input validation, and build every prompt
  server-side.
- **Mock mode** works everywhere with zero API keys. **Local mode** (no Supabase yet) lets browser tabs act as
  iPad and phones.
- **Tested:** two-window end-to-end test in local mode (article flow, website flow, Original toggle, queue
  handoff, per-visitor reset, admin).

## Next
1. **User:** set the `ADMIN_PASSCODE` secret in Supabase, then test on the real iPad and a phone.
2. Fix anything that shows up on real devices (iOS Safari quirks, sizing).
3. **User:** Replicate token in Supabase secrets. Then pick and **pin the exact model version** in
   `CONFIG.TEXT_MODEL` (currently uses the latest `meta/meta-llama-3-8b-instruct`, version not pinned yet).
4. Real-AI test with a few generations, then back to mock until the show if you prefer.
5. Your real article(s), artwork (`public/assets/`) and website design.
6. Later sessions: Reel, Image, Song, and stats.

## Needed from the user
- Supabase account and project: Project URL and the publishable (anon) key.
- A staff passcode (set as a Supabase secret `ADMIN_PASSCODE`; the default `1116` in the public repo is only for
  local testing).
- Replicate account and API token (only needed to leave mock mode).

## Decisions / notes
- Own folder and repo, not inside the Sigma Chi repo. Renamed to "Algorithm Graffiti"; "Who tunes your reality?"
  is the tagline.
- **The repo is public** (free GitHub Pages requires it). No secrets in it; staff passcode is a Supabase secret.
- **Explicit send buttons** ("REWRITE ARTICLE", "REBUILD WEBSITE") instead of sending on every knob twist. This
  keeps AI calls (and the daily cap) under control and makes the moment of "transmitting" feel deliberate.
- **Typewriter instead of true streaming:** the server returns the whole rewrite; the iPad types it out. Simpler
  and survives fallbacks the same way.
- **Waiting phones** are kept for 3 minutes without check-ins (locked screens pause the page), but are skipped
  when it's their turn if they haven't checked in within 12s.
- **Reset mode `per_visitor`:** when a turn ends, the iPad goes back to the originals. Switch to `persist` in
  config to let changes pile up.
- The phone shows a document picker only if there's more than one article.
- Reel, Image and Song appear on the iPad but are "offline" on the phone until their sessions.
- Placeholder article (invented "Harbor Point" streetlights story) and placeholder website ("Orbitwell") are
  original, so there are no copyright issues.

## Known issues
- In desktop browser testing, hidden background tabs get throttled and can be dropped from the queue. Real phones
  behave normally while the page is open.
