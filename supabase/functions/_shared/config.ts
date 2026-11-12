// GENERATED COPY of src/shared/config.ts. Edit that file instead, then run `npm run sync-shared`.
// ============================================================
//  INSTALLATION CONFIG
//  This is the one file to edit for show settings.
//  After editing, run `npm run deploy` (site) and
//  `npm run deploy:functions` (server) so both sides match.
// ============================================================

export const CONFIG = {
  /** Internal name. Not shown on the iPad or phones. */
  TITLE: 'MEDIA STATION',
  TAGLINE: '',

  // ---------- Visitor queue ----------
  /**
   * Seconds a visitor may hold control. 0 = no time limit (Version 2).
   * Do not show a countdown on the iPad or phones.
   */
  TURN_SECONDS: 0,
  /** Seconds without touching anything before control passes on. 0 = never drop for inactivity (turn ends only at the report or staff skip). */
  IDLE_SECONDS: 0,
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
  AI_TIMEOUT_SECONDS: 30,
  /** Fake delay range for mock mode, in seconds. */
  MOCK_DELAY_SECONDS: [2, 5] as [number, number],
  /** Rough expected time for real generations (drives the progress bar). */
  EXPECTED_SECONDS: { article: 18, reel: 2, ad: 42, chat: 8 } as Record<string, number>,
  /** Time zone used for the daily cap and the staff page counter. */
  TIME_ZONE: 'America/New_York',

  /**
   * How to reach Replicate. "proxy" = NYU class proxy (default). "direct" = api.replicate.com.
   * TODO before exhibit Nov 16: switch to REPLICATE_MODE=direct and set REPLICATE_API_KEY
   * as a Supabase secret. The NYU proxy token expires about hourly.
   */
  REPLICATE_MODE: 'proxy' as 'proxy' | 'direct',
  PROXY_URL: 'https://itp-ima-replicate-proxy.web.app/api/create_n_get',
  /** Cheap-model requests allowed per day on the NYU proxy (with a token). */
  PROXY_QUOTA_CHEAP: 500,
  /** Expensive-model requests (we do not use these). */
  PROXY_QUOTA_EXPENSIVE: 10,
  /** If true, ad headlines/paragraphs go through the text model. Off = templates. */
  AI_AD_COPY: false,

  /**
   * Cheap Replicate models, pinned. Wrapper sends `version` when hash is set, else `model`.
   * Costs are approximate public Replicate prices (NYU proxy is billed to ITP/IMA).
   */
  MODELS: {
    text: {
      model: 'meta/meta-llama-3-8b-instruct',
      version: '5a6809ca6288247d06daf6365557e5e429063f32a21146b2a807c682652136b8',
      kind: 'cheap' as const,
      note: '~$0.05/1M in + $0.25/1M out on Replicate; long article ≈ a few cents',
    },
    // Group chat runs on the bigger model for persona voice + reliable JSON.
    // version '' → DIRECT mode uses the /v1/models/<model>/predictions endpoint
    // (no version pin needed). On the proxy this would 404, so keep REPLICATE_MODE=direct.
    chat: {
      model: 'meta/meta-llama-3-70b-instruct',
      version: '',
      kind: 'cheap' as const,
      note: '~$0.65/1M in + $2.75/1M out on Replicate; a chat turn ≈ a fraction of a cent',
    },
    vision: {
      model: 'lucataco/moondream2',
      version: 'fe364e0c95b9142eef216ee8bf227b345097fee629b26bac3f4aed19f7b30a4d',
      kind: 'cheap' as const,
      note: '~$0.0012 per run',
    },
    stt: {
      model: 'vaibhavs10/incredibly-fast-whisper',
      version: '',
      kind: 'cheap' as const,
      note: 'whisper-large-v3; pinned hash was disabled on Replicate, so the proxy uses current model',
    },
    image: {
      model: 'black-forest-labs/flux-schnell',
      version: 'c846a69991daf4c0e5d016514849d14ee5b2e6846ce6b9d6f21369e564cfe51e',
      kind: 'cheap' as const,
      note: 'schnell; about a cent or less per image',
    },
    tts: {
      model: 'jaaari/kokoro-82m',
      version: 'f559560eb822dc509045f3921a1921234918b91739db4bf3daab2169b71c7a13',
      kind: 'cheap' as const,
      note: '~$0.0004 per run',
    },
    embed: {
      model: 'gte-small',
      version: '',
      kind: 'cheap' as const,
      note: 'Supabase Edge built-in, free, 384-d. Replicate only if that fails.',
    },
    music: {
      // Station object (the "advertisement"). Lyricless instrumental.
      // Must be version-pinned: meta/musicgen isn't on Replicate's official-models
      // endpoint, so an unpinned call 404s. ~30-60s/clip (A100, "expensive").
      model: 'meta/musicgen',
      version: '671ac645ce5e552cc63a54a2bbff63fcf798043055d2dac5fc9e36a837eedcfb',
      kind: 'cheap' as const,
      note: 'instrumental station; slow (~30-60s). Cached by genre+dial corner.',
    },
  },

  // ---------- Ads ----------
  /** Debounce before a settled ad dial set requests FLUX. */
  AD_GENERATE_DEBOUNCE_MS: 400,
  /** Legacy popup caps (popups removed in v3; kept so old profiles hydrate). */
  AD_POPUP_MAX: 0,
  AD_POPUP_GAP_SECONDS: 45,
  /** Optional Replicate TTS for radio ads. Off = browser speechSynthesis. */
  RADIO_AD_TTS: false,

  // ---------- Content ----------
  /** Public address of the deployed site; the server reads articles and ads from here. */
  SITE_URL: 'https://ritzcrackers12.github.io/algorithm-graffiti',

  /**
   * Phone controller only. Live green telemetry behind the controls.
   * Off = the old per-object metal backgrounds.
   */
  CODE_BG_ENABLED: false,
  CODE_BG: {
    /** Terminal green. */
    color: '#33FF66',
    /** Older lines. */
    dim: '#1a7a3c',
    /** Occasional brighter line. */
    bright: '#b5ffcb',
    fontSize: 11,
    lineHeight: 13,
    /** 1 = default. Raise for more lines per gesture. */
    density: 1,
    /** 1 = default typing rate. */
    speed: 1,
    /** After a tap, keep typing this long (ms) so a press can finish a burst. */
    lingerMs: 260,
    maxLines: 96,
    /** Per-object off switch. Missing keys stay on. */
    objects: { article: true, reel: true, ad: true, chat: true },
  },

  /** Words that are rejected anywhere a visitor can type. Lowercase. Add more as needed. */
  BLOCKLIST: [
    'fuck', 'shit', 'cunt', 'bitch', 'nigger', 'nigga', 'faggot', 'fag', 'retard',
    'whore', 'slut', 'rape', 'kike', 'spic', 'chink', 'tranny', 'nazi', 'hitler',
    'kill', 'porn', 'cock', 'dick', 'pussy',
  ],
} as const

export type ObjectId = 'article' | 'reel' | 'ad' | 'chat'

export const OBJECTS: { id: ObjectId; label: string; file: string; ready: boolean }[] = [
  { id: 'article', label: 'ARTICLE', file: 'article.txt', ready: true },
  { id: 'reel', label: 'REEL', file: 'reel.mp4', ready: true },
  { id: 'ad', label: 'STATION', file: 'station.wav', ready: true },
  { id: 'chat', label: 'CHATBOT', file: 'agent.exe', ready: true },
]

/** Ready objects, in the order a visitor must finish them. */
export const playableObjects = () => OBJECTS.filter((o) => o.ready)

export function nextObject(completed: readonly string[] = []): ObjectId | null {
  return playableObjects().find((o) => !completed.includes(o.id))?.id ?? null
}
