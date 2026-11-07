# PROGRESS: Algorithm Graffiti

_Last updated: Nov 7, 2026 (Version 2, Phase B 5-reel test)_

## Phase B (5-reel test, in progress)

Five rows `001`–`005` from `content/reel-library.xlsx`. Raw files stay in `content/reels-raw/` (gitignored). Compressed copies are in the public Supabase bucket `reels`.

- **Match:** first frames checked on `#/reel-check`. Confirmed.
- **Compress:** vertical H.264 ~5 MB. Instagram follow end-cards trimmed (~4s) on 001–003. Small baked-in IG username watermarks remain on 001–003 (they’re in the whole clip, not just the end). 004 has no IG card. 005 ends on the Cantina ad frame (content, not IG).
- **Upload:** `reels/001.mp4` … `005.mp4` at `https://nkmeiqwhwuuysdahyzju.supabase.co/storage/v1/object/public/reels/{id}.mp4`
- **Tag:** empty cells only. Energy from ffmpeg (all medium, speech detected). Vision captions (moondream) + Llama JSON. STT skipped: pinned `incredibly-fast-whisper` version is disabled on Replicate, and the unpinned model 404s. Tagged file: `content/reel-library-tagged.xlsx` (light blue + `ai_filled`).
- **Import:** 5 rows + 5 gte-small embeddings in `ag_reels`. Local copy `public/content/reels.json`.
- **Visitor flow:** phone `ENTER ONE WORD` → closest reel → HIGH/MEDIUM/LOW → next, no repeats. Sponsored items look like normal reels (no “Sponsored”, no ⓘ). Session line at the end includes `SPONSORED ITEMS`. `#/credits` lists creator names (empty until that column is filled).

### Library balance (these 5)

| | |
|---|---|
| n | 5 |
| sponsored | 3 (001, 002, 005) |
| topic | beauty/fashion 1, humor 4 |
| audience | young men 1, general 3, teens 1 |
| depth | 1 × 3, 2 × 2 |

Llama still leaned “humor/prank” on 002–005 even with curator notes marked most reliable. Overlap/embeddings also use `curator_notes`, so words like `vivek` / `dance` / `rap` still match.

## Phase P (done)

- **Spec:** Section 11 is the NYU proxy. Section 4 / Reel is the spreadsheet pipeline.
- **Wrapper:** `supabase/functions/_shared/replicateClient.ts`. `REPLICATE_MODE` default `proxy`.
- **Admin:** paste proxy token, quota, PROXY OK / TOKEN EXPIRED / DAILY LIMIT REACHED.
- **Cache:** `ag_ai_cache`. Embeddings: `gte-small` first.

### Pinned models (cheap only)

| Job | Model | Version pin | Cost note |
|---|---|---|---|
| Text | `meta/meta-llama-3-8b-instruct` | `5a6809ca6288247d06daf6365557e5e429063f32a21146b2a807c682652136b8` | ~$0.05/1M in + $0.25/1M out |
| Vision | `lucataco/moondream2` | `fe364e0c95b9142eef216ee8bf227b345097fee629b26bac3f4aed19f7b30a4d` | ~$0.0012 / run |
| STT | `vaibhavs10/incredibly-fast-whisper` | *(pin disabled / model 404 — needs a new cheap STT)* | — |
| Image | `black-forest-labs/flux-schnell` | `c846a69991daf4c0e5d016514849d14ee5b2e6846ce6b9d6f21369e564cfe51e` | schnell |
| TTS | `jaaari/kokoro-82m` | `f559560eb822dc509045f3921a1921234918b91739db4bf3daab2169b71c7a13` | ~$0.0004 / run |
| Embed | Supabase `gte-small` | built-in | free |

## Phase A (done)

Four icons, no turn timer, visitor profile, placeholder ads, sponsored paragraph, Game locked.

## Needed from the user

1. Fresh NYU proxy token on `#/admin` when it expires (~hourly).
2. A working cheap STT model if we want transcripts on the next batch.
3. Optional: `REPLICATE_API_TOKEN` if we switch to **direct** for the show.
4. `ADMIN_PASSCODE` secret before the gallery.

## Decisions / notes

- 5-reel test: no round-3 forced sponsored, no sponsored chrome on the player.
- Proxy media: data URLs with `image/jpeg` were rejected (`only works for png, jpg, and wav`). Tag assets are uploaded to `reels/tag/` and passed as public URLs.
- Do not git-push large MP4s. Raw and work folders are gitignored.
