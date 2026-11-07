# PROGRESS: Algorithm Graffiti

_Last updated: Nov 7, 2026 (Version 2, Phase A)_

## Phase A (done)

- **Spec:** `PROJECT_SPEC.md` is Version 2.
- **Removed:** Image, Website, and Block Safety (files, icons, routes, Edge Function paths, config slots). Desktop is four icons: Article, Reel, Song, Game.
- **Timer gone:** `TURN_SECONDS` is 0. No countdown on the phone or iPad. Idle handoff is 60s and invisible. Queue, admin skip, and `RESET_MODE` are unchanged.
- **Visitor profile:** anonymous, per turn, no IP lookup. Device + behavior + Article knobs. Rule-based inferred traits in `src/shared/profile.ts`. Deleted at end of turn unless `RESET_MODE = persist`. Wired into Article generate.
- **Ads:** 6 placeholder rows in `public/content/ads.csv` + `public/assets/ads/`. Scoring, mock personalization, XP pop-ups (max 3, first after leaving the first object, 45s gap, only at home or while loading), ⓘ “Why am I seeing this?” with official line + FULL REPORT from real scores.
- **Article:** controls unchanged. Every rewrite weaves a sponsored paragraph (`%%SPONSORED%%`) marked “Sponsored content” with ⓘ. Live mode still uses the Llama rewrite, then inserts the paragraph so source facts are not edited.
- **Game icon:** locked (`ACCESS RESTRICTED. INSUFFICIENT DATA.`) with ⓘ. Unlock logic is Phase D.
- **Reel / Song:** open to a stub window (`NO SIGNAL.`). Real flows are Phases B and C.
- **On-screen copy:** visitor-facing strings checked against Section 0 (no show title, no commentary). Internal name is `MEDIA STATION`.
- **SQL:** `supabase/migrations/20261107180000_v2_phase_a.sql` (profile column, `signal` command, turn=0, used[], objects article|reel|song|game).
- **Tests:** `npm run test:sql`, `npm run build`.

## Next (wait for “continue”)

1. **Phase B:** Reel CSV + videos (or 10 placeholders), embeddings, new chatbot/rating flow, round-3 sponsored reel.
2. Phase C Song, Phase D Game, Phase E end screen + `npm run test:replicate`.

## Needed from the user

- Nothing required to test Phase A in two browser tabs (local or live mock).
- For **Phase B:** `content/reels.csv` and the MP4 folder, or say to use placeholders.
- For **Phase C:** song files + metadata, or say to use placeholders.
- Before the show: `ADMIN_PASSCODE` and `REPLICATE_API_TOKEN` as Supabase secrets; pin `CONFIG.TEXT_MODEL.version`; confirm state profiles.

## Decisions / notes (Version 2)

- Sponsored paragraph is inserted after the rewrite (mock templates now; live uses the same post-insert so facts never change). Same-call weaving can wait until a later pass.
- Pop-up scheduling lives on the phone (active session) and the iPad only displays `profile.lastAd`.
- Game stays locked until Phase D even if two objects are used.
- Finance category scoring currently boosts higher income; `income<=60k` rules still add a match bonus for placeholder 2.

## Earlier (Session 1, still true)

- Public repo https://github.com/ritzcrackers12/algorithm-graffiti → GitHub Pages. Supabase `nkmeiqwhwuuysdahyzju` us-west-2.
- Article stories: MAGA coalition, data centers, military AI. Phone chooser before dials. Mock-first. Daily cap 200, 5s rate limit, 30s timeout.
- State profiles are a **DRAFT** — verify before the show.
- Waiting phones kept 3 minutes; skipped if gone 12s when their turn comes.
- Typewriter on the iPad, not true streaming.
