# PROGRESS

_Last updated: Nov 6, 2026 (Session 1, planning)_

## Done
- Created project folder `who-tunes-your-reality` (separate from the Sigma Chi site) and an empty git repo.
- Saved `PROJECT_SPEC.md`.
- GitHub repo created (public, required for free GitHub Pages): https://github.com/ritzcrackers12/who-tunes-your-reality
- GitHub login fixed; created public repo https://github.com/ritzcrackers12/who-tunes-your-reality and pushed `main`. (Public because free GitHub Pages requires it; no secrets ever go in the repo.)

## Next (Session 1)
1. Vite + React + TS + Tailwind scaffold, hash routing, central config, manifest, GitHub Pages workflow.
2. Supabase schema (queue, state, generation counter), realtime channel, `generate` Edge Function (mock mode, cap, rate limit, fallbacks).
3. Queue + QR code + admin page.
4. iPad XP desktop (icons, windows, progress dialog, tap-to-begin, connection status).
5. Phone controller shell (queue screen, timer, picker, Home, Original/Altered, background slots).
6. Article controller + streaming rewrite.
7. Website controller + restyle/rewrite of placeholder site.
8. Two-window end-to-end test, then device test steps.

## Needed from the user
- Supabase account + project (URL, anon key, service role key for function secrets).
- Replicate account + API token (only for leaving mock mode).
- Staff passcode for `#/admin`.

## Decisions / notes
- Project lives in its own folder and repo, not inside the Sigma Chi website repo.

## Known issues
- None yet.
