# Algorithm Graffiti — PROJECT SPEC (Version 2)

NYU IMA gallery installation. Opens **November 16**.

This file is the brief. Version 2 replaces the parts it covers. Anything not changed here stays from Version 1 (device roles, XP look, tech stack, AI/key rules, reliability, how we work).

I'm not a programmer: **you write all code, run all commands, and test your own work**. When something needs me (a file, a login, a key), give numbered click-by-click steps. Work **one phase at a time** (Section 11). After each phase: commit, update `PROGRESS.md`, tell me in plain sentences what works and how to test it, and wait for me to say **"continue."**

---

## 0. Important: no theme or commentary on screen

The piece must feel like a **neutral, real-seeming system**. Nowhere on the iPad or phones (labels, dialogs, chatbot lines, end screen, public pages) should there be any text that comments on, explains or hints at the concept: no mentions of algorithms shaping people, "the usual," manipulation, surveillance, critique, or a show title.

Everything visitors see is **plain cold machine system language**, the way real software talks about itself. If you're unsure whether a line counts as commentary, leave it out.

---

## 1. What Version 2 changed

**Removed:** Image and Website objects (icons, controllers, routes, Edge Function paths, config, asset slots). **Block Safety** entirely (photos, files, references, ads).

**Kept as is:** the **Article** object. Don't change its controls or behavior except Section 5 (sponsored paragraph + feeding the profile).

**Updated:** Reel (Section 4) and Song (Section 7: radio ad + male/female voice toggle).

**New:** visitor profile (Section 3), advertising in each object plus 2–3 pop-up ads (Section 6), first version of a Game (Section 8), neutral end-of-turn screen (Section 9).

**UI:** don't redesign yet. Keep new screens functional and plain, consistent with the current XP + cold machine style.

**Desktop icons (4):** Article, Reel, Song, Game. Visitors choose freely which to open.

---

## 2. Roles of each device (unchanged)

- **iPad (`#/library`): display only.** Tap-to-begin for audio on iOS. Audio through headphones on the iPad.
- **Phone (`#/controller`): all choosing.** Visitor picks an object, uses its controls, **BACK TO ICONS** returns the iPad to the desktop without ending the turn. **END SESSION** ends the turn.
- Picking an object on the phone: matching iPad icon "clicks," then opens as an XP window.
- While a change is processing: XP progress dialog, cold status line, green block progress bar.
- Result appears in the iPad window. Phone stays on the same controls.
- Every object window: **Original / Altered** toggle from the phone.

---

## 3. Visitor turns

**No turn length and no countdown timer.** No time limit. No timer shown anywhere.

A turn ends only when the visitor presses **END SESSION**, closes the page, or is idle for **60 seconds** (config). The idle check is **invisible**: no countdown.

Queue (one person at a time, queue position screen), admin (staff can skip the current visitor) and `RESET_MODE` stay the same.

Gone / waiting-phone rules from Version 1 stay (active phone dropped if it stops checking in; waiting phones keep a place with a locked screen).

---

## 4. Persistence and staff (unchanged except timer)

- `RESET_MODE`: `"per_visitor"` (default) or `"persist"`.
- Hidden staff page `#/admin`, passcode. Reset to originals, skip visitor, clear queue, mock on/off, today's generation count, **proxy token paste, proxy/direct toggle, quota and `PROXY OK` / `TOKEN EXPIRED` / `DAILY LIMIT REACHED`**.
- Profile is deleted at the end of the turn, or kept across visitors only if `RESET_MODE = "persist"`. The anonymous action log keeps working.

---

## 5. The visitor profile (temporary data)

Each turn gets an anonymous, temporary profile: no names, accounts or contact info.

### Signals

| Source | Signals |
|---|---|
| Device (from the moment they connect, no permission prompts) | device type/OS, approximate screen size, browser language, local time of day |
| Behavior | how fast they move controls, hesitation before ratings/choices, whether they push controls to extremes |
| Article | political lean, education, income bracket, location (state/country), connotation, sensationalism |
| Reel | words typed, HIGH/MEDIUM/LOW ratings, tags of reels rated HIGH vs LOW, how they rated the sponsored reel |
| Song | stations landed on, genres chosen, emotion slider positions, vocal pitch, male/female voice choice |
| Game | which game, choices, risk-taking, whether they engaged with the shop offer |

### Inferred traits (rule-based, editable config)

Income bracket, region, political lean, dominant mood, top interests, age-range guess, "susceptibility" (sensationalism + ad engagement), and a ranked list of ad categories they match, each with a confidence score.

Rules:

- Do **not** look up location from network/IP.
- Profile deleted at end of turn (or kept if `RESET_MODE = "persist"`).
- README gets a short factual line (for the wall label): what's collected, that it's anonymous, and that it's deleted after each turn.

---

## 6. The four media objects

### A. Article (done — small additions only)

Controls unchanged (FRAME: lean, connotation, sensationalism; AUDIENCE: education, income, location). Visitor picks the original from thumbnails before the dials.

Additions:

- Every control value feeds the profile.
- **Sponsored paragraph:** weave one short sponsored paragraph into the rewritten article: a product mention from the visitor's best-matching ad, written in the same voice the knobs produced. Faint "Sponsored content" label and an ⓘ button. Must **not** change any facts in the article. Live mode: same Replicate call. Mock mode: template paragraph.

### B. Reel (Phase B)

**Spreadsheet.** `reel-library.xlsx` (**Reels** tab) or `reels.csv`, plus a folder of MP4s named by row id (`001.mp4` … `100.mp4`).

Columns: `id, file, link, creator, topic, subtopic, audience, mood, energy, format, vibe, depth, keywords, description, curator_notes, notes, sponsored, ad_category`.

- `topic` = broad category. `subtopic` = niche. `audience` = who it's made for. Same topic can have completely different audiences.
- `depth`: `1 mainstream` … `5 deep end`.
- Dropdowns from the **Lists** tab are suggestions; accept any typed value.
- `curator_notes` = private intent. **Never show on screen.** Admin view and exports only.
- `notes` = flow rules. Turn into rules where possible; list any that couldn't be interpreted.
- `sponsored = yes` + `ad_category` = sponsored reels.
- Many reels are deliberately strange. Do not filter them out for being weird.

**Step 1 — Check, compress, upload.** Row↔file match report. ffmpeg: vertical H.264 ~5 MB. Flag Instagram watermarks/end cards, then trim. Upload to Supabase Storage bucket `reels`.

**Step 2 — Auto-tagger** (`npm run tag:reels`). Resumable. For each reel: 3–4 frames; ~30s low-bitrate mono audio → STT through the wrapper; energy from ffmpeg scene-cut frequency + loudness (`low`/`medium`/`high`); frames (proxy base64-to-URL) + transcript → vision model → JSON `topic, subtopic, audience, mood, format, vibe, depth, keywords, description`. May propose a new subtopic/audience (flag those). **Only fill empty cells. Never overwrite typed values.** Write `reel-library-tagged.xlsx` with AI-filled cells highlighted light blue and an `ai_filled` column. Cache per reel, resume, default cap 300 requests/run. If the proxy is down, skip AI and leave blank. After review I'll hand the file back for import.

**Step 3 — Import.** Spreadsheet → Supabase table (every column + transcript). One embedding per reel from `description + keywords + subtopic + transcript` (Section 11 embedding rules) with pgvector. `#/credits` page + README for the wall label. Report library balance: counts per topic, audience, depth, and how many sponsored.

**Step 4 — Visitor flow** (nothing about the logic is explained on screen). Phone chatbot: `ENTER ONE WORD.` Blocklist. **Round 1:** embed the word, closest reel, prefer depth 1–2 unless the word clearly matches deeper. Rate HIGH / MEDIUM / LOW:

| Rating | Audience | Depth | Topic | Other |
|---|---|---|---|---|
| **HIGH** | Same audience | +1 (max 5) | May drift across topics in that audience | Prefer a different format |
| **MEDIUM** | Keep audience **or** topic | Same | — | Small sideways step by meaning |
| **LOW** | Different audience | −1 (min 1) | Different | Different mood too |

Energy moves at most one step per round, except after LOW. **Round 3 is always a sponsored reel** (`sponsored = yes` in the library): embed/overlap its `description + tags` against the visitor's liked audiences/topics, inferred interests, mood, and best-matching ad category; if nothing fits well, fall back to the next-closest by `ad_category`. Never show the same sponsored reel twice in a turn. **No "Sponsored" label and no ⓘ** — it looks like a normal reel (UGC-style native ad; only the end-session data reveals it). Its rating still feeds the profile. **No pop-up ads while the Reel object is open.** Apply `notes` rules. Never repeat a reel within a turn. After 5 rounds: `SESSION RECORDED. 5 PREFERENCES SAVED.` Own player: vertical, autoplay, loop, XP window, muted until tap-to-begin. No Instagram branding, links or UI. Mock: tag-word overlap.

**Step 5 — Data.** Log each round: reel id, tags, rating, hesitation, depth. Profile: audience affinity (HIGH), max depth + path, topic/subtopic/mood prefs, sponsored rating. Session data view, plain system language only, e.g. `AUDIENCE SEGMENT: YOUNG MEN / SELF-IMPROVEMENT · MAX DEPTH: 4 · PATH: 1→2→3→4→4`. No commentary.

If the spreadsheet/videos aren't in yet, wait — do not invent a fake library until asked.

### C. Song (Phase C)

2–4 songs. Either full song (split once on Replicate) or vocals-only + instrumental I already separated. Plus 4–6 other-genre instrumentals at the same tempo and key. Metadata per song: title, bpm, key, original_voice (male/female), voice_notes, genre of each instrumental. Audio in Supabase Storage bucket `songs`.

**Controls:** radio dial through static; genre swap (vocals stay, instrumentals crossfade in sync); **MALE / FEMALE** voice toggle (starts at `original_voice`; converted vocals cached from Replicate; fallback formant-preserving pitch shift); vocal pitch; emotion sliders (mapping in config): Melancholy, Euphoria, Anxiety, Anger, Numbness, Nostalgia.

**Radio ad:** after the first station change, a short radio ad before the next station: personalized `voice_script` via browser TTS over a jingle bed. Optional Replicate TTS behind a config flag. Web Audio API / Tone.js.

If song files aren't in yet, build with placeholder audio.

### D. Game (Phase D — first version, expect changes)

Modular so games can be swapped later.

Icon starts **locked:** `ACCESS RESTRICTED. INSUFFICIENT DATA.` ⓘ "Why can't I open this?" in plain system language. Unlocks after the visitor has used **2 other objects:** `UNLOCKED BASED ON YOUR ACTIVITY.`

Profile picks 1 of 3 tiny games ("RECOMMENDED FOR YOU"); the other two locked with their own ⓘ:

1. Slot machine: tap to pull; outcomes and near-misses tuned by profile (not installed)
2. Auction (not installed)
3. Higher or Lower
4. DigiPet: Tamagotchi economy. Starting allowance from `incomeBracket`. Every care action is a purchase. Measures attachment (revives / ad-continues) and what they buy (`itemsBought`, `topCategories`, `QUALITY_PREFERENCE`). Recommended when mood is anxious / melancholy / numb. Phone is a same-color priced grid; iPad is the pet only.

Phone is the controller. Short delay phone→iPad: slow, timing-forgiving, nothing twitchy. DigiPet spending maps into ad scoring via `PET_AD_RULES` in `adTaxonomy.ts`.

---

## 7. Advertising system

### Ad library

`content/ads.csv`: placeholder image rows (`id, category, brand, product, tagline, image, voice_script, target_rules`). Images live in `public/assets/ads/`.

**Parody brand catalog** (the actual brands the engine riffs on): `src/shared/parodyBrands.ts`. Each entry: parody name, real brand/category it references, category, product copy, and target keywords. Add, rename, or retarget there. Hard limits: names and logos **reference but never copy** a real brand; **never parody or depict a real person**; drug/vape/gambling copy is **satirical, not promotional**.

How the engine uses it:

1. Score every catalog row against the visitor profile (interests, inferred demographics, mood, income, susceptibility, liked reel tags). Pick the **best match**.
2. If nothing fits well, **invent a new parody brand** in the closest category rather than forcing a bad row — prefer things currently in culture/media.
3. Generate copy (and later images) from that parody plus the profile and the placement.

Starting catalog (edit in `src/shared/parodyBrands.ts`): POLECULEMARKET (Polymarket), BLUE COW (Red Bull), DEMON (Monster), FORYOU FINDS (TikTok Shop), SONARA (JBL / Marshall), VOID ATELIER (Rick Owens aesthetic — invented house name), MAISON NÉANT No. 9 (Chanel), MOON LAB (Round Lab), THE GENERIC (The Ordinary), ZEMPIK (Ozempic / GLP-1, satirical), SOLACE AI (Replika), QUICKCASH (payday / BNPL, satirical), KINGSBET (DraftKings / FanDuel, satirical), COINFLIP (Coinbase / meme coins, satirical), ZING (Zyn, satirical), GRINDSET ACADEMY (hustle courses), HAUL (Shein / Temu), RIZZ (Tinder / Hinge), BULKMAX (gym supplements), VOLTA (Tesla), plus NYC 18–40 additions: EDENHAUS (Erewhon), FRESHLEAF (Sweetgreen), INFERNO (Barry's), REFORM (reformer Pilates), BLANK SLATE (Blank Street), CLARITY (BetterHelp), SERENE (Calm / Headspace), ROAM (Hims), BLOOM (Hers), ASTRL (Co-Star), SHERWOOD (Robinhood), BORO (Aimé Leon Dore), COGNIS (ChatGPT / AI tools), OUR TABLE (Our Place), APEX RESERVE (Amex Platinum), NATTY (natural wine), GREEN DOOR (NY dispensary, satirical), SPINNR (Spotify). After editing, run `node scripts/sync-shared.mjs`.

Scoring (in `src/shared/parodyBrands.ts` + `src/shared/adTaxonomy.ts`): premium vs budget from Article income + pet `SPENDING` / `QUALITY_PREFERENCE`; wellness/therapy/meditation from anxious/melancholy mood; betting/trading/crypto from game risk and loss-chasing; ROAM vs BLOOM from a **low-confidence gender guess** (reel audience tags, never appearance); luxury/status (APEX RESERVE, MAISON NÉANT, VOLTA, EDENHAUS) from high income + aspirational + premium; ASTRL / COGNIS from education + the on-theme “algorithm knows you” angle. Low-confidence profiles fall back to broad daily brands (BLANK SLATE, SPINNR, FRESHLEAF, FORYOU FINDS) instead of a niche miss.

Reel **Lists** tab (`content/reel-library.xlsx`) includes matching `topic` / `subtopic` / `audience` / `ad_category` clusters so HIGH ratings can actually point at a family.

Reel native ads do **not** use this catalog: they use sponsored rows in the reel library.

### Personalization

Score every ad against the **full profile** every time an ad is chosen, using all signals available at that moment. The first ad already uses device + early behavior + whatever inputs exist. Each new input updates scores. Don't repeat an ad within a turn.

Personalize copy with the profile (headline, framing, tone), matched to education, lean, mood, income. Replicate text live; template fallback in mock. Keep each ad's **score breakdown** for the FULL REPORT.

### Where ads appear

| Object | Native ad |
|---|---|
| Reel | Sponsored reel in round 3 (no overlay, no "Sponsored", no ⓘ) |
| Article | Sponsored paragraph (parody brand) |
| Song | Radio ad between stations (parody brand) |
| Game | In-game shop offer or banner, priced/worded by income (parody brand) |

Plus **2–3 pop-up ads** per turn on the iPad: XP-style windows, fake-looking close (real close works), ad image + personalized headline. **Never while the Reel object is open.**

**Timing.** Native ads in every object, including the first one opened. Pop-ups: max 3 per turn; first after the visitor finishes their first object; at least 45 seconds apart; only during loading dialogs or when switching objects; never during a rating, a game move, the Reel window, or the end screen.

### "Why am I seeing this?"

Every generated ad (article, pop-up, radio, shop) has ⓘ → two-layer panel. Reel sponsored items do **not**.

1. Official: vague, like real platforms: `You're seeing this ad based on your activity.`
2. **FULL REPORT** button: exact signals, source, time, match confidence. 100% accurate from actual scores and rules that fired, never AI guessing. Plain system language only. Name the parody and its real reference, e.g. `… → BETTING (parody of Polymarket) "POLECULEMARKET"`.

---

## 8. End of turn (Phase E)

When a turn ends (END SESSION, page closed, or idle):

iPad XP dialog: `SESSION COMPLETE.` Buttons **OK** and **VIEW SESSION DATA**.

VIEW SESSION DATA lists what was collected and inferred, with sources and times, plain system language, no commentary.

Then clear the profile and pass control to the next visitor.

---

## 9. Design (unchanged except copy and icons)

- iPad = Windows XP. No Microsoft Bliss or Windows logo.
- Desktop icons large, idle / clicked / altered animations.
- Phone: per-object background photos I'll supply; large thumb-friendly controls; haptics; no page scroll / pinch-zoom.
- Voice: cold machine. Short, uppercase or clinical.
- iPad landscape 4:3 scaled; phones portrait.

### Asset slots

`public/assets/`:

- `wallpaper.jpg` 2732×2048
- `start-button.png`
- `icon-article.png`, `icon-reel.png`, `icon-song.png`, `icon-game.png` (512×512, optional `icon-*-altered.png`)
- `bg-article.jpg`, `bg-reel.jpg`, `bg-song.jpg`, `bg-game.jpg` (1170×2532)
- `ads/` — placeholder and later real ad images

Large video/audio: **Supabase Storage only, never git.**

---

## 10. Tech stack (unchanged)

Only GitHub and Supabase (plus Replicate). Vite + React + TypeScript + Tailwind. GitHub Pages, hash routing, `base: '/algorithm-graffiti/'`. Supabase Realtime + Edge Functions. Media in Supabase Storage.

---

## 11. AI calls: NYU Replicate proxy (Phase P)

All live AI goes through **one wrapper**. `REPLICATE_MODE`:

- **`proxy` (default):** `POST https://itp-ima-replicate-proxy.web.app/api/create_n_get` with `Authorization: Bearer <token>`. Body `{ "model": "<owner/name>", "input": { ... } }` or `{ "version": "<owner/name:hash>", "input": { ... } }`. The proxy creates the prediction, **waits until finished**, returns JSON; result is in `output`. **No streaming.** Media: send a data URL in the model's input field, plus top-level `fieldToConvertBase64ToURL` (that field's name) and `fileFormat` (e.g. `".jpg"`, `".wav"`). Token from admin paste or Supabase secret `REPLICATE_PROXY_TOKEN`. Tokens can expire as often as every hour. Limits with a token: 500/day cheap models, 10/day expensive. **Do not use expensive (e.g. video) models.** ITP/IMA pays; no Replicate account needed.
- **`direct`:** `https://api.replicate.com/v1` with secret `REPLICATE_API_TOKEN`. Wait/poll. Media: upload to Supabase Storage and pass the URL. Switch to this for the exhibition if NYU cannot raise limits.

Same `{ model/version, input }` in both modes. Every workflow uses this wrapper.

**Admin (`#/admin`):** paste a new proxy token (stored server-side, never shown back in full) + last-updated time; `proxy` / `direct` toggle; today's request count and estimated remaining quota; status `PROXY OK` / `TOKEN EXPIRED` / `DAILY LIMIT REACHED`.

**Failures:** token expired or limit hit → cached or pre-made content. Visitors never see an error. Only admin shows status.

**Cut live calls during the show:**

- Cache every AI result by its inputs (e.g. article control settings). Repeats cost nothing.
- **Ad copy:** templates filled with profile values by default. AI-written ad copy is an optional flag, **off**.
- **Embeddings:** Supabase Edge `gte-small` first (free). Else Replicate embedding through the wrapper. Else tag-word overlap.
- Target: about 2–5 proxy calls per visitor, mostly Article and audio.

**No streaming.** Article (and any spoken-word script) appears complete after the XP progress dialog. No typewriter.

`npm run test:replicate`: one call per workflow through the current mode; print pass/fail, timing, a short look at the response, and how many requests the test used. Keep it small.

Phone still sends IDs/values only. `MOCK_MODE` default ON. Daily generation cap, 1 per 5 seconds, 30-second timeout, fallbacks remain. Pin model versions; list in `PROGRESS.md` with cost notes.

### Jobs

| Job | When | Through | Fallback |
|---|---|---|---|
| Article rewrite + sponsored paragraph | Live, per change | Text model | Mock rules + template paragraph |
| Ad copy personalization | Optional flag, off | Text model | Template with profile values |
| Radio ad personalized script | Live, per radio ad | Text model | Template |
| Reel embeddings | Once, at import | `gte-small` → wrapper → overlap | Tag-word overlap |
| Visitor word embedding | Live, per word | Same | Tag-word overlap |
| Reel auto-tag / description | `tag:reels`, empty cells only | Vision + STT | Leave blank |
| Ad images (no image) | Once per ad, cached | FLUX schnell-type | Text-only pop-up |
| Song stem separation | Once per full song | Stem separation | I separate them |
| Male/female vocal conversion | Once per song, cached | Voice conversion | Formant-preserving pitch shift |
| Radio ad voice (optional, off) | Live | TTS | Browser TTS |

---

## 12. Reliability (unchanged)

Auto-reconnect, CONNECTED / RECONNECTING, no double realtime, lock controls while generating, cache-busting, iOS tap-to-begin, muted+playsinline until unlocked, Home Screen manifests.

---

## 13. Logging

Anonymous action log: timestamp, object, controls, word, rating, etc. No personal data. Stretch later: collective drift, `#/stats`.

---

## 14. Phases

**Phase A:** Remove Image, Website and Block Safety. Remove turn length and countdown. Profile system (device + behavior) wired into Article. Ad library (placeholders) + scoring/personalization + "Why am I seeing this?" + pop-ups. Sponsored paragraph in Article. Check every on-screen string against Section 0.

**Phase P:** Replicate wrapper (NYU proxy default, direct fallback), admin token/mode/quota/status, AI result cache, ad-copy flag off, `gte-small` embeddings, no typewriter, `npm run test:replicate`.

**Phase B:** Reel pipeline (check/compress/upload, auto-tagger, import, visitor flow, logging). Wait for the spreadsheet and MP4s.

**Phase C:** Song file prep, controls, male/female toggle, radio ad. Placeholder audio if files aren't in.

**Phase D:** Game (lock/unlock, 3 tiny games, shop offer).

**Phase E:** Neutral end-of-turn screen + session data view, full two-window test, real iPad/phone steps. Then README: where files go, how to add ads, mock vs live, gallery-day checklist.

---

## 15. How to work with me

- Commit after each working phase with a clear message.
- After each phase, say in one or two plain sentences what now works and how to see it. Wait for **continue**.
- If something is ambiguous, make a sensible choice, note it in `PROGRESS.md`, and keep going.
- Keep `README.md` accurate.
