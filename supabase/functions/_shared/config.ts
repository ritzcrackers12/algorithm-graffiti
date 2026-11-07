// GENERATED COPY of src/shared/config.ts. Edit that file instead, then run `npm run sync-shared`.
// ============================================================
//  ALGORITHM GRAFFITI: INSTALLATION CONFIG
//  This is the one file to edit for show settings.
//  After editing, run `npm run deploy` (site) and
//  `npm run deploy:functions` (server) so both sides match.
// ============================================================

export const CONFIG = {
  /** Title shown on the desktop and controller. */
  TITLE: 'ALGORITHM GRAFFITI',
  TAGLINE: 'WHO TUNES YOUR REALITY?',

  // ---------- Visitor queue ----------
  /** Seconds each visitor controls the installation (covers the full media sequence). */
  TURN_SECONDS: 240,
  /** Seconds without touching anything before control passes on. */
  IDLE_SECONDS: 40,
  /** The visitor in control is dropped if their phone stops checking in (locked / tab closed) this long. */
  GONE_SECONDS: 12,
  /** People waiting in line keep their place this long with a locked phone (they're skipped if their turn comes while away). */
  WAITING_GONE_SECONDS: 180,
  /** How often phones and the iPad check in with the server (milliseconds). */
  HEARTBEAT_MS: 3000,

  // ---------- Persistence ----------
  /** "per_visitor": each visitor starts from the originals. "persist": changes build up across visitors. */
  RESET_MODE: 'per_visitor' as 'per_visitor' | 'persist',

  // ---------- Staff page (#/admin) ----------
  /**
   * Passcode for the staff page. The GitHub repo is public, so on the live site the
   * server uses the Supabase secret ADMIN_PASSCODE instead when it is set (see README).
   */
  ADMIN_PASSCODE: '1116',

  // ---------- AI generation ----------
  /** Starting value for mock mode. Staff can flip it on #/admin; the live value is stored in Supabase. */
  MOCK_MODE: true,
  /** Real AI generations allowed per day (New York time). After this, pre-made content is shown. */
  DAILY_GENERATION_CAP: 200,
  /** Minimum seconds between generations. */
  RATE_LIMIT_SECONDS: 5,
  /** Any AI call slower than this falls back to pre-made content. */
  AI_TIMEOUT_SECONDS: 40,
  /** Fake delay range for mock mode, in seconds. */
  MOCK_DELAY_SECONDS: [2, 5] as [number, number],
  /** Rough expected time for real generations (drives the progress bar). */
  EXPECTED_SECONDS: { article: 18, website: 12 } as Record<string, number>,
  /** Time zone used for the daily cap and the staff page counter. */
  TIME_ZONE: 'America/New_York',

  /**
   * Replicate text model. Pinned by exact version id so it can't change under us.
   * Find versions at replicate.com/<owner>/<model>/versions.
   */
  TEXT_MODEL: {
    owner: 'meta',
    name: 'meta-llama-3-8b-instruct',
    version: '', // filled in when we switch off mock mode (see PROGRESS.md)
  },

  // ---------- Content ----------
  /** Public address of the deployed site; the server reads articles and the base website from here. */
  SITE_URL: 'https://ritzcrackers12.github.io/algorithm-graffiti',

  /** Words that are rejected anywhere a visitor can type. Lowercase. Add more as needed. */
  BLOCKLIST: [
    'fuck', 'shit', 'cunt', 'bitch', 'nigger', 'nigga', 'faggot', 'fag', 'retard',
    'whore', 'slut', 'rape', 'kike', 'spic', 'chink', 'tranny', 'nazi', 'hitler',
    'kill', 'porn', 'cock', 'dick', 'pussy',
  ],
} as const

export type ObjectId = 'reel' | 'website' | 'article' | 'image' | 'song'

export const OBJECTS: { id: ObjectId; label: string; file: string; ready: boolean }[] = [
  { id: 'reel', label: 'REEL', file: 'reel.mp4', ready: false },
  { id: 'website', label: 'WEBSITE', file: 'homepage.htm', ready: true },
  { id: 'article', label: 'ARTICLE', file: 'article.txt', ready: true },
  { id: 'image', label: 'IMAGE', file: 'ideal.bmp', ready: false },
  { id: 'song', label: 'SONG', file: 'station.wav', ready: false },
]

/** Ready objects, in the order a visitor must finish them. */
export const playableObjects = () => OBJECTS.filter((o) => o.ready)

export function nextObject(completed: readonly string[] = []): ObjectId | null {
  return playableObjects().find((o) => !completed.includes(o.id))?.id ?? null
}
