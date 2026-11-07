# PROGRESS: Algorithm Graffiti

_Last updated: Nov 7, 2026 (Version 2, Phase P)_

## Phase P (done)

- **Spec:** Section 11 is the NYU proxy. Section 4 / Reel is the new spreadsheet pipeline (Phase B, not built yet).
- **Wrapper:** `supabase/functions/_shared/replicateClient.ts`. `REPLICATE_MODE` default `proxy` → `https://itp-ima-replicate-proxy.web.app/api/create_n_get`. `direct` → `api.replicate.com`. Same `{ model | version, input }` plus optional `fieldToConvertBase64ToURL` / `fileFormat`.
- **Admin:** paste proxy token (stored on `ag_state`, only last 4 shown), last-updated time, proxy/direct toggle, today's proxy count vs 500 cheap quota, status `PROXY OK` / `TOKEN EXPIRED` / `DAILY LIMIT REACHED`.
- **Failures:** expired token or limit → cached or mock article. Visitors never see an error.
- **Cache:** `ag_ai_cache` keyed by SHA-256 of job + inputs. Same article knobs reuse the rewrite.
- **Ad copy:** still templates (`AI_AD_COPY` is off).
- **Embeddings:** `gte-small` on the Edge Function first (free, 384-d). Replicate only if that fails.
- **No typewriter:** the altered article appears whole when the progress dialog closes.
- **`npm run test:replicate`:** embed + (if a token is saved) one tiny text call. `--all` adds vision/image/tts. STT waits for Phase B audio.

### Pinned models (cheap only)

| Job | Model | Version pin | Cost note |
|---|---|---|---|
| Text | `meta/meta-llama-3-8b-instruct` | `5a6809ca6288247d06daf6365557e5e429063f32a21146b2a807c682652136b8` | ~$0.05/1M in + $0.25/1M out; a long article is a few cents |
| Vision | `lucataco/moondream2` | `fe364e0c95b9142eef216ee8bf227b345097fee629b26bac3f4aed19f7b30a4d` | ~$0.0012 / run |
| STT | `vaibhavs10/incredibly-fast-whisper` | `3ab86df6c8f54c11309d4d1f930ac292bad43ace52d10c80d87eb258b3c9f79c` | short clip ≪ $0.01 |
| Image | `black-forest-labs/flux-schnell` | `c846a69991daf4c0e5d016514849d14ee5b2e6846ce6b9d6f21369e564cfe51e` | schnell; about a cent or less |
| TTS | `jaaari/kokoro-82m` | `f559560eb822dc509045f3921a1921234918b91739db4bf3daab2169b71c7a13` | ~$0.0004 / run |
| Embed | Supabase `gte-small` | built-in | free |

No video models.

## Phase A (done)

Four icons, no turn timer, visitor profile, placeholder ads, sponsored paragraph, Game locked. See git history.

## Next (wait for “continue”)

**Phase B: Reel** — needs your spreadsheet + MP4 folder.

## Needed from the user

1. **Now, for a live proxy test:** log in at https://itp-ima-replicate-proxy.web.app/ with your **nyu.edu** account, copy a fresh token, paste it on `#/admin` (SAVE PROXY TOKEN). Tokens can expire about every hour.
2. For **Phase B:** `reel-library.xlsx` (or `reels.csv`) and the MP4 folder, or say to wait.
3. Optional later: `REPLICATE_API_TOKEN` in Supabase secrets if we switch to **direct** for the show.
4. `ADMIN_PASSCODE` secret before the gallery.

## Decisions / notes

- Default `test:replicate` does **not** spend quota when no token is saved (embed only). With a token it makes **one** tiny text call unless you pass `--all`.
- Article rewrite is cached by canonical control values so repeats are free.
- Sponsored paragraph is still inserted after the rewrite so source facts stay put.
- `fieldToConvertBase64ToURL` is sent at the top level of the proxy body, matching the class p5 examples.
