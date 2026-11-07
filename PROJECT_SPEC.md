# Cursor prompt: "Library + Controller" (Session 1)

Open an empty folder in Cursor, start a new Agent chat, and paste everything below the line.
For Sessions 2 and 3, start a **new** chat and say: "Read PROJECT_SPEC.md and PROGRESS.md, then do Session 2" (or 3).

---

You're building an interactive art installation with me for an NYU IMA gallery show due **November 16**. I'm not a programmer: I'm vibe coding, so **you do all the coding, run all commands, and test your own work**. Whenever you need something only I can do (create an account, log in, paste a key, upload a file), stop and tell me in plain, numbered steps exactly what to do and where to click.

**First, save this entire message as `PROJECT_SPEC.md` in the project root.** Keep a `PROGRESS.md` file updated with what's done, what's next and any known issues, so later chats can pick up where we left off.

**Only build Session 1 now.** Before writing code, give me a short plan for Session 1 and list anything you need from me.

---

## 1. The concept

A Windows XP–style "desktop" on an iPad shows five media objects as large, animated icons. Visitors scan a QR code and use **their own phone** as a remote control. The phone shows a custom controller for whichever object is open; the visitor's choices reshape that object using AI or algorithms, and the result appears on the iPad. Theme: who tunes your reality?

## 2. Roles of each device

- **iPad (`#/library`): display only.** No touch interaction is needed except an initial "tap to begin" (required for audio on iOS). Audio plays through headphones plugged into the iPad.
- **Phone (`#/controller`): does all the choosing.** The visitor picks an object, operates its controls, and can press a **Home** button that returns the iPad to the desktop.
- When the visitor picks an object on the phone, the matching icon on the iPad plays a "clicked" animation, then opens as an XP-style window ("file") containing that object.
- When a change is processing, the iPad shows an **XP-style progress dialog** (classic green block progress bar), with a cold machine status line, e.g. `RECALIBRATING OUTPUT. 3 SECONDS REMAINING.`
- When the result is ready it appears in the iPad window. The phone controller stays on the same controls (so the visitor can keep adjusting).
- Every object window has an **Original / Altered toggle** (controlled from the phone) to flip between the original and the current altered version.

## 3. Visitor queue (one person at a time)

- A QR code shown on the iPad desktop (small, in a corner, like a desktop sticky note) opens the controller URL.
- Only **one visitor controls at a time**. The first to arrive gets control for **90 seconds**, or until **20 seconds of inactivity**, then control passes to the next person.
- Everyone else sees a queue screen with their position: `QUEUE POSITION: 3. STAND BY.`
- The active visitor sees a visible countdown timer.
- Make the turn length and idle timeout settings in one config file.
- The queue must survive phones locking or closing the tab: if the active visitor disappears, control passes on automatically.

## 4. Persistence and reset

- Add a setting `RESET_MODE` in config with two options: `"per_visitor"` (each visitor starts from the originals) and `"persist"` (changes build up across visitors). I haven't decided yet; default to `"per_visitor"`.
- Add a hidden staff page (`#/admin`, protected by a simple passcode set in config) with: reset everything to originals, skip the current visitor, clear the queue, turn mock mode on/off, see today's generation count.

## 5. The five media objects

### A. Reel (Session 2)
- Content: ~100 vertical MP4 reels I will upload to Supabase Storage.
- **Prep script (run once, before the show):** for each reel, grab a frame (or a few), use a vision/captioning model on Replicate to describe it, then create an embedding of that description and store it in Supabase (pgvector). Let me edit tags/descriptions afterward.
- **Controller:** a chatbot interface. The bot asks for **one word**. The word is embedded and matched to the closest reel by meaning. The reel plays on the iPad.
- The visitor then rates the reel **HIGH / MEDIUM / LOW**. The next reel adapts: HIGH → move closer to that reel's meaning, MEDIUM → small shift, LOW → move away toward a different cluster. Never repeat a reel within a visit.
- This loop runs **5 times**, then the bot ends the session with a cold summary, e.g. `PROFILE COMPLETE. 5 PREFERENCES RECORDED.`
- Filter offensive words before matching (simple blocklist in config).

### B. Website (Session 1: controller + system only)
- **I will supply the base website myself later.** For now, build with a simple placeholder homepage (generic, invented company, no real brands) so everything works end to end.
- Load the base site from `public/content/website/base/` so I can swap it later. Elements that the AI may rewrite get a `data-editable` attribute; colors/fonts come from CSS variables.
- **Controls:** an **era dial** (1996 / 2006 / 2016 / 2026), a **country model** the visitor either types or picks from a flag grid (e.g. "hyper-capitalist", "heavy state moderation"), and a **mood slider** that shifts color tones and details by emotion.
- On change, call the AI (via the server function, see §8), which returns JSON: new CSS variable values + rewritten text for each `data-editable` element. Apply it in the iPad window.

### C. Article (Session 1)
- 1–3 source articles I'll provide as Markdown in `public/content/articles/`.
- **Controls (6):** facts stay fixed; only framing, emphasis, vocabulary, tone and packaging change.
- Phone is two panels — **FRAME** (lean, connotation, sensationalism) and **AUDIENCE** (education, income, location).

| Control | Settings | Effect |
|---|---|---|
| Political lean | Far left → Far right | Who the story is for. MAGA as villain vs. elite overreach. |
| Education | 6-stop knob. Default: College graduate | Who it is written for. No diploma = short and concrete. Graduate degree = KEY TAKEAWAYS + measured close. Never mocking. |
| Connotation | Neg / Neutral / Pos | Emotional color, separate from left/right. |
| Sensationalism | None → Maximum | Packaging last. Maximum is clickbait. |
| Income | 6-stop slider, **unset until touched** | Which wallet issues get the extra line (rent vs. 401(k) vs. markets). |
| Location | State / DC / country autocomplete | Local angle from `state-profiles` (DRAFT). International = observer, no partisan lean. |

- Apply order: lean → income → location → education → connotation → sensationalism.
- The AI rewrites the article accordingly. The iPad types the result. Live output is JSON `{headline, body}`; invented numbers fall back to mock.

### D. Image (Session 2)
- **Controller:** asks the visitor a series of questions, one at a time (store the questions in a config file; I'll write the real ones later; use 5 placeholder questions for now).
- Their answers are turned into an image prompt on the server, and a fast, cheap image model on Replicate (e.g. a FLUX "schnell"-type model; check replicate.com for the current name) generates their "ideal" art piece.

### E. Song (Session 3)
- **No live AI.** Library of 2–4 songs. For each song I'll provide: a **vocals-only** track and **4–6 instrumentals in other genres at the same tempo and key**, plus a metadata file (title, BPM, key, genre of each instrumental).
- **Radio dial:** the visitor turns a tuning dial through static to land on a song ("station").
- **Genre swap:** keep the vocals, swap the instrumental underneath. Keep them perfectly in sync (start all tracks together, switch by crossfading volumes rather than restarting).
- **Pitch control** for the vocals.
- **Emotion sliders** that control effects under the hood (editable mapping in config): Melancholy → lower pitch, slower, reverb · Euphoria → higher pitch, brighter, faster · Anxiety → accelerating echo, slight wobble · Anger → distortion, boosted drums · Numbness → muffled low-pass filter · Nostalgia → vinyl crackle, warm detune.
- Use the Web Audio API (Tone.js is fine).

### Logging (Session 2)
- Log every visitor action to a Supabase table: timestamp, object, controls used, word typed, rating, etc. No personal data.
- **Stretch goals (only if time allows, after everything else works):** "collective drift" (in persist mode, each visitor's choices nudge defaults for the next visitor) and an audience-data screen (`#/stats`) with a word cloud of typed words and a "distance from original" meter.

## 6. Design

- **iPad = Windows XP aesthetic:** blue taskbar, glossy rounded window title bars, XP-style dialogs and progress bars. You may use the open-source XP.css library or recreate the look in CSS. **Do not use Microsoft's actual Bliss wallpaper or Windows logo:** I'll supply my own wallpaper and Start button image.
- **Desktop icons:** much larger and more prominent than real XP icons. Each has a gentle **idle animation**, a **"clicked" animation** when selected, and a visible **"altered" state** (e.g. glitch, badge, tint) once visitors have changed it.
- **Phone controllers:** each object has a **custom full-screen background image I'll supply**. You design and animate the actual controls on top (knobs, dials, sliders, chat bubbles, the radio dial), with satisfying motion and haptics (`navigator.vibrate` where supported). Controls must be large and easy to use with a thumb.
- **Voice of all text: cold machine.** Short, uppercase or clinical system language: `INPUT RECEIVED.`, `PREFERENCE PROFILE UPDATED.`, `OUTPUT GENERATED.`
- Target screens: iPad in landscape (design for 4:3, scale responsively) and phones in portrait.
- Disable page scroll, pull-to-refresh and pinch-zoom on the controller so dragging a knob never moves the page.

### Asset slots (build with placeholders, I'll drop real files in)
Put all of these in `public/assets/` and list them in the README:
- `wallpaper.jpg`: 2732×2048
- `start-button.png`: my custom Start button
- `icon-reel.png`, `icon-website.png`, `icon-article.png`, `icon-image.png`, `icon-song.png`: 512×512, transparent PNG (optional `icon-*-altered.png` variants)
- `bg-reel.jpg`, `bg-website.jpg`, `bg-article.jpg`, `bg-image.jpg`, `bg-song.jpg`: 1170×2532 phone backgrounds

## 7. Tech stack (use exactly this)

- **Only GitHub and Supabase** (plus Replicate for AI). No Vercel or other hosts.
- **Front end:** Vite + React + TypeScript + Tailwind, deployed to **GitHub Pages** with a GitHub Actions workflow. Use hash routing (`#/library`, `#/controller`, `#/admin`, `#/stats`) and set Vite's `base` correctly.
- **Realtime sync:** Supabase Realtime (broadcast channel for live control messages; database tables for the queue, state and logs).
- **Server code:** Supabase Edge Functions. All AI calls go through them.
- **Media storage:** Supabase Storage (reels, songs). Large files must not go in the GitHub repo.
- **AI:** Replicate, for text (an LLM hosted on Replicate), images, captioning and embeddings.

## 8. Rules for AI calls, keys and cost

- The Replicate token lives **only** in Supabase secrets. Never in front-end code or the repo.
- The phone sends **only object IDs and control values**, never prompts. The server builds every prompt from fixed templates and validates all inputs.
- **`MOCK_MODE`** (default ON): returns pre-made fallback content after a fake 2–5 second delay. Everything must work with zero API keys.
- **Daily generation cap** (config, default 200), enforced in the Edge Function; after the cap, show pre-made content. Also rate-limit to 1 generation per 5 seconds.
- Any AI call that fails or takes over 30 seconds falls back to pre-made content: never show an error screen to visitors.
- Pin exact model versions once chosen.

## 9. Reliability

- Auto-reconnect when the connection drops; small "CONNECTED / RECONNECTING" status indicator on both devices.
- Avoid double-firing realtime events (React StrictMode / duplicate subscriptions).
- Lock controls while a generation is running.
- Cache-busting on deploy so the iPad never shows an old version.
- iOS: "tap to begin" screen on the iPad for audio; videos use `muted` + `playsinline` until audio is unlocked.
- Add a web app manifest so both pages can be added to the Home Screen and run full screen.

## 10. Sessions

**Session 1 (now):**
1. Project setup, GitHub repo, GitHub Pages deploy, Supabase connection (tell me exactly what to create and paste).
2. QR code + one-at-a-time queue + admin page.
3. iPad XP desktop with 5 placeholder icons (idle / clicked / altered animations), XP windows, progress dialog, Original/Altered toggle.
4. Phone controller shell: queue screen, timer, object picker, Home button, per-object background slots.
5. **Article** controller + AI rewrite (mock mode first, then real).
6. **Website** controller + restyle/rewrite system using the placeholder site.
7. Test the whole loop yourself in two browser windows, then give me steps to test on a real iPad and phone.

**Session 2:** Reel (prep script + chatbot + rating loop), Image (question flow + generation), logging.

**Session 3:** Song, adding my real assets, final device testing, gallery-day checklist (Guided Access, Auto-Lock off, notifications off, brightness, Supabase not paused).

**Stretch:** collective drift, `#/stats` screen.

## 11. How to work with me

- Commit to Git after each working step with a clear message, so we can roll back.
- After each step, tell me in one or two plain sentences what now works and how to see it.
- If something is ambiguous, make a sensible choice, note it in `PROGRESS.md`, and keep going: don't stall.
- Keep `README.md` up to date: setup, where to put my assets and content, how to deploy, how to test on devices.
