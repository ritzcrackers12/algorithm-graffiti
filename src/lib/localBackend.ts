// LOCAL MODE: used when Supabase isn't configured (or with ?local in the URL).
// Mirrors the SQL rules in supabase/migrations using localStorage, so several tabs in the
// same browser can act as iPad + phones. Generation is always mock here.
import { pickAd, personalizeAd, reservedAdIds, weaveSponsored } from '../shared/ads.ts'
import { canonicalArticleParams, mockArticle, validateArticleParams } from '../shared/article.ts'
import { CONFIG, OBJECTS } from '../shared/config.ts'
import { gameIconLocked, objectsTouched } from '../shared/games.ts'
import { resolveLocation } from '../shared/locations.ts'
import { emptyProfile, hydrateProfile, inferProfile, type VisitorProfile } from '../shared/profile.ts'
import {
  AFFINITY_KEY, addRating, emptyAffinity, emptyReelResult, logRound,
  parseAffinity, pickNext, pickStart, playableUrl, rowFromRecord, sessionLine,
  attachPrefetch, type ReelResult, type ReelRow,
} from '../shared/reel.ts'
import type { AdminStatus, Altered, ArticleResult, DisplayState, ProxyStatus, ReplicateMode, Snapshot, Source } from '../shared/types.ts'
import type { Backend } from './backend.ts'
import { loadArticle } from './content.ts'
import { emitGameWire, type GameWire } from './gameSync.ts'
import { emitReelClip, noteReelClip } from './reelSync.ts'

const REEL_KEY = 'ag-reel-ended'
const AFFINITY_LS = `ag-${AFFINITY_KEY}`

function loadAffinity() {
  try {
    return parseAffinity(JSON.parse(localStorage.getItem(AFFINITY_LS) || 'null'))
  } catch {
    return emptyAffinity()
  }
}

function saveAffinity(a: ReturnType<typeof emptyAffinity>) {
  localStorage.setItem(AFFINITY_LS, JSON.stringify(a))
}

interface DB {
  activeSession: string | null
  turnStartedAt: number | null
  lastActivityAt: number | null
  display: DisplayState
  altered: Altered
  profile: VisitorProfile
  mockMode: boolean
  replicateMode: ReplicateMode
  proxyToken: string | null
  proxyTokenUpdatedAt: number | null
  proxyStatus: ProxyStatus
  version: number
  queue: { id: string; joinedAt: number; lastSeen: number }[]
  generations: { id: number; at: number; object: string; source: string }[]
}

const KEY = 'ag-local-db-v2'
const HOME: DisplayState = { open: null, view: 'original', busy: null, openedAt: 0, completed: [], used: [], articleId: null }

function fresh(): DB {
  return {
    activeSession: null, turnStartedAt: null, lastActivityAt: null, display: { ...HOME }, altered: {}, profile: emptyProfile(),
    mockMode: true, replicateMode: 'proxy', proxyToken: null, proxyTokenUpdatedAt: null, proxyStatus: 'unknown',
    version: 0, queue: [], generations: [],
  }
}
const read = (): DB => {
  try {
    return { ...fresh(), ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }
  } catch {
    return fresh()
  }
}

export function createLocalBackend(): Backend {
  const listeners = new Set<() => void>()
  const fire = () => listeners.forEach((cb) => cb())
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) fire()
    if (e.key === REEL_KEY && e.newValue) {
      try {
        noteReelClip(JSON.parse(e.newValue))
        fire()
      } catch { /* ignore */ }
    }
  })

  function write(db: DB, notify: boolean) {
    localStorage.setItem(KEY, JSON.stringify(db))
    if (notify) setTimeout(fire, 0)
  }

  function advance(db: DB): boolean {
    const now = Date.now()
    let changed = false
    let busy = db.display.busy
    if (busy && busy.startedAt < now - 90_000) {
      busy = null
      changed = true
    }
    const fresh = (q: { lastSeen: number }) => q.lastSeen >= now - CONFIG.GONE_SECONDS * 1000
    db.queue = db.queue.filter((q) => q.lastSeen >= now - CONFIG.WAITING_GONE_SECONDS * 1000)
    const reset = () => {
      db.display = { ...HOME, busy }
      if (CONFIG.RESET_MODE === 'per_visitor') {
        db.altered = {}
        db.profile = emptyProfile()
      }
    }
    const turnOver = CONFIG.TURN_SECONDS > 0 && db.turnStartedAt! <= now - CONFIG.TURN_SECONDS * 1000
    if (
      db.activeSession &&
      (!db.queue.some((q) => q.id === db.activeSession && fresh(q)) ||
        turnOver ||
        (!busy && db.lastActivityAt! <= now - CONFIG.IDLE_SECONDS * 1000))
    ) {
      db.queue = db.queue.filter((q) => q.id !== db.activeSession)
      db.activeSession = db.turnStartedAt = db.lastActivityAt = null
      reset()
      changed = true
    }
    const next = [...db.queue].filter(fresh).sort((a, b) => a.joinedAt - b.joinedAt || a.id.localeCompare(b.id))[0]
    if (!db.activeSession && next) {
      db.activeSession = next.id
      db.turnStartedAt = db.lastActivityAt = now
      reset()
      changed = true
    }
    db.display = { ...db.display, busy }
    if (changed) db.version++
    return changed
  }

  function snapshot(db: DB, session: string | null): Snapshot {
    const waitingRows = db.queue
      .filter((q) => q.id !== db.activeSession)
      .sort((a, b) => a.joinedAt - b.joinedAt || a.id.localeCompare(b.id))
    let position = -1
    if (session && db.activeSession === session) position = 0
    else if (session) {
      const i = waitingRows.findIndex((q) => q.id === session)
      if (i >= 0) position = i + 1
    }
    return {
      hasActive: !!db.activeSession, turnStartedAt: db.turnStartedAt, lastActivityAt: db.lastActivityAt,
      display: { ...db.display, completed: db.display.completed ?? [], used: db.display.used ?? [], articleId: db.display.articleId ?? null },
      altered: db.altered, profile: db.profile ?? emptyProfile(), mockMode: db.mockMode, version: db.version,
      serverNow: Date.now(), waiting: waitingRows.length, position,
    }
  }

  function today(db: DB) {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const rows = db.generations.filter((g) => g.at >= start.getTime())
    return {
      ai: rows.filter((g) => g.source === 'ai').length,
      mock: rows.filter((g) => g.source === 'mock').length,
      fallback: rows.filter((g) => g.source === 'fallback' || g.source === 'cap').length,
      total: rows.length,
    }
  }

  let reelLibrary: ReelRow[] | null = null
  async function loadReels(): Promise<ReelRow[]> {
    if (reelLibrary) return reelLibrary
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}content/reels.json`)
      if (res.ok) {
        const rows = await res.json() as Record<string, unknown>[]
        reelLibrary = rows.map((r) => rowFromRecord(r)).filter((r) => r.id)
        return reelLibrary
      }
    } catch { /* empty library */ }
    reelLibrary = []
    return reelLibrary
  }

  function produceReel(params: { action: string; seed?: number; rating?: 'HIGH' | 'MEDIUM' | 'LOW'; hesitationMs?: number }, library: ReelRow[], prev: ReelResult | undefined, profile?: VisitorProfile): ReelResult {
    const current = prev ?? emptyReelResult()
    if (params.action === 'start' || params.action === 'word') {
      if (current.phase === 'done') return current
      if (current.currentId && (current.phase === 'playing' || current.phase === 'rate')) return current
      const pick = pickStart(library, loadAffinity(), params.seed || Date.now())
      if (!pick) {
        return { ...emptyReelResult(), phase: 'done', sessionLine: 'NO LIBRARY.', at: Date.now(), source: 'fallback' }
      }
      return attachPrefetch({
        word: '',
        phase: 'playing', currentId: pick.id, videoUrl: playableUrl(pick.id),
        rounds: [logRound(pick, null, 0)], usedIds: [pick.id], sessionLine: '',
        source: 'mock', at: Date.now(), prefetchId: null,
      }, library, loadAffinity(), profile)
    }
    const rating = params.rating
    if (!rating || !current.currentId) return { ...current, at: Date.now() }
    const cur = library.find((r) => r.id === current.currentId)
    const rounds = current.rounds.map((r, i) =>
      i === current.rounds.length - 1 ? { ...r, rating, hesitationMs: params.hesitationMs ?? 0 } : r,
    )
    if (!cur) return { ...current, rounds, phase: 'done', sessionLine: sessionLine(rounds), at: Date.now() }
    const last = rounds[rounds.length - 1]
    if (last) saveAffinity(addRating(loadAffinity(), last, rating))
    const next = pickNext(library, current.usedIds, cur, rating, rounds, loadAffinity(), null, true, profile)
    if (!next) {
      return { ...current, rounds, currentId: null, videoUrl: null, phase: 'done', sessionLine: sessionLine(rounds), at: Date.now(), source: 'mock', prefetchId: null }
    }
    const nextRounds = [...rounds, logRound(next, null, 0)]
    return attachPrefetch({
      ...current, rounds: nextRounds, usedIds: [...current.usedIds, next.id],
      currentId: next.id, videoUrl: playableUrl(next.id), phase: 'playing',
      sessionLine: sessionLine(nextRounds), at: Date.now(), source: 'mock', prefetchId: null,
    }, library, loadAffinity(), profile)
  }

  function finish(id: number, session: string, object: 'article' | 'reel', result: unknown, source: Source) {
    const db = read()
    const g = db.generations.find((x) => x.id === id)
    if (g) g.source = source
    const keep = db.activeSession === session || CONFIG.RESET_MODE === 'persist'
    if (db.display.busy?.id === id) db.display = { ...db.display, busy: null }
    if (keep && result) {
      db.altered = { ...db.altered, [object]: result as ArticleResult | ReelResult }
      if (db.display.open === object) db.display = { ...db.display, view: 'altered' }
    }
    if (db.activeSession === session) db.lastActivityAt = Date.now()
    db.version++
    write(db, true)
  }

  return {
    kind: 'local',
    async heartbeat(session, join) {
      const db = read()
      const row = db.queue.find((q) => q.id === session)
      let joined = false
      if (row) row.lastSeen = Date.now()
      else if (join) {
        db.queue.push({ id: session, joinedAt: Date.now(), lastSeen: Date.now() })
        joined = true
      }
      const changed = advance(db)
      write(db, changed || joined)
      return snapshot(db, session)
    },
    async tick() {
      const db = read()
      write(db, advance(db))
      return snapshot(db, null)
    },
    async command(session, cmd, arg = null) {
      const db = read()
      const changed = advance(db)
      if (db.activeSession !== session) {
        write(db, changed)
        return { ...snapshot(db, session), ok: false }
      }
      const row = db.queue.find((q) => q.id === session)
      if (row) row.lastSeen = Date.now()
      db.lastActivityAt = Date.now()
      const completed = db.display.completed ?? []
      if (cmd === 'signal' && arg) {
        try {
          const patch = JSON.parse(arg) as Partial<VisitorProfile>
          db.profile = hydrateProfile({ ...db.profile, ...patch })
        } catch { /* ignore */ }
      } else if (cmd === 'story' && arg && /^[a-z0-9-]{1,40}$/.test(arg)) {
        const used = db.display.used ?? []
        db.display = {
          ...db.display,
          open: 'article',
          articleId: arg,
          view: db.altered.article?.params.articleId === arg ? 'altered' : 'original',
          openedAt: Date.now(),
          used: used.includes('article') ? used : [...used, 'article'],
        }
      } else if (cmd === 'open' && OBJECTS.some((o) => o.id === arg)) {
        const obj = arg as 'article' | 'reel' | 'song' | 'game'
        if (obj === 'game' && gameIconLocked(objectsTouched(db), db.profile.game?.seen ?? [])) {
          write(db, changed)
          return { ...snapshot(db, session), ok: false }
        }
        if (obj === 'reel') {
          const library = await loadReels()
          const latest = read()
          Object.assign(db, latest)
          if (db.activeSession !== session) {
            write(db, changed)
            return { ...snapshot(db, session), ok: false }
          }
          const prevReel = db.altered.reel
          if (!prevReel?.currentId || prevReel.phase === 'word' || prevReel.phase === 'idle') {
            const pick = pickStart(library, loadAffinity(), Date.now())
            if (pick) {
              db.altered = {
                ...db.altered,
                reel: attachPrefetch({
                  word: '',
                  phase: 'playing',
                  currentId: pick.id,
                  videoUrl: playableUrl(pick.id),
                  rounds: [logRound(pick, null, 0)],
                  usedIds: [pick.id],
                  sessionLine: '',
                  source: 'mock',
                  at: Date.now(),
                  prefetchId: null,
                }, library, loadAffinity(), db.profile),
              }
            }
          }
        }
        const used = db.display.used ?? []
        db.display = {
          ...db.display,
          open: obj,
          view: obj === 'reel' && db.altered.reel?.currentId
            ? 'altered'
            : obj === 'article' && db.altered.article ? 'altered' : 'original',
          openedAt: Date.now(),
          articleId: obj === 'article' ? db.display.articleId : null,
          used: used.includes(obj) ? used : [...used, obj],
        }
      } else if (cmd === 'home') db.display = { ...db.display, open: null, articleId: null }
      else if (cmd === 'done') {
        const cur = db.display.open
        const next = cur && !completed.includes(cur) ? [...completed, cur] : completed
        db.display = { ...db.display, open: null, articleId: null, completed: next }
      }
      else if (cmd === 'view' && (arg === 'original' || arg === 'altered')) db.display = { ...db.display, view: arg }
      else if (cmd === 'end') {
        db.queue = db.queue.filter((q) => q.id !== session)
        advance(db)
      }
      if (cmd !== 'touch') db.version++
      write(db, cmd !== 'touch')
      return { ...snapshot(db, session), ok: true }
    },
    async generate(req) {
      const articleParams = req.object === 'article' ? validateArticleParams(req.params) : null
      let reelParams: { action: 'start' | 'rate'; seed?: number; rating?: 'HIGH' | 'MEDIUM' | 'LOW'; hesitationMs?: number } | null = null
      if (req.object === 'article') {
        if (!articleParams) return { ok: false, reason: 'invalid' }
      } else if (req.object === 'reel') {
        const p = req.params as { action?: string; seed?: number; rating?: 'HIGH' | 'MEDIUM' | 'LOW'; hesitationMs?: number }
        if (p.action !== 'start' && p.action !== 'word' && p.action !== 'rate') return { ok: false, reason: 'invalid' }
        reelParams = {
          action: p.action === 'rate' ? 'rate' : 'start',
          seed: typeof p.seed === 'number' ? p.seed : Date.now(),
          rating: p.rating,
          hesitationMs: p.hesitationMs,
        }
      } else {
        return { ok: false, reason: 'invalid' }
      }
      const db = read()
      if (db.activeSession !== req.session) return { ok: false, reason: 'not_active' }
      if (db.display.busy && db.display.busy.startedAt > Date.now() - 90_000) return { ok: false, reason: 'busy' }
      const last = db.generations.at(-1)
      const rate = req.object === 'reel' ? 0 : CONFIG.RATE_LIMIT_SECONDS
      if (rate && last && last.at > Date.now() - rate * 1000) {
        return { ok: false, reason: 'cooldown', secondsLeft: Math.ceil((last.at + rate * 1000 - Date.now()) / 1000) }
      }
      const [lo, hi] = CONFIG.MOCK_DELAY_SECONDS
      const delay = req.object === 'reel' ? 0 : Math.round(lo + Math.random() * (hi - lo))
      const id = (last?.id ?? 0) + 1
      db.generations.push({ id, at: Date.now(), object: req.object, source: 'pending' })
      db.generations = db.generations.slice(-500)
      db.display = { ...db.display, busy: { id, object: req.object, startedAt: Date.now(), etaSeconds: delay } }
      db.lastActivityAt = Date.now()
      db.version++
      write(db, true)

      const started = Date.now()
      void (async () => {
        let result: unknown = null
        try {
          if (req.object === 'article' && articleParams) {
            const p = articleParams
            const out = mockArticle(p, await loadArticle(p.articleId), resolveLocation(p.location))
            const profile = inferProfile({ ...emptyProfile(), ...db.profile, ...(req.profile ?? {}) })
            const match = pickAd({ ...profile, adsShown: reservedAdIds(profile) }, undefined, db.altered.reel?.rounds)
            const sponsored = match ? personalizeAd(match, profile) : undefined
            result = {
              params: canonicalArticleParams(p),
              ...out,
              body: sponsored ? weaveSponsored(out.body, sponsored.paragraph) : out.body,
              sponsored,
              source: 'mock',
              at: Date.now(),
            }
          } else if (req.object === 'reel' && reelParams) {
            const library = await loadReels()
            const reelProfile = inferProfile({ ...emptyProfile(), ...db.profile, ...(req.profile ?? {}) })
            result = produceReel(reelParams, library, db.altered.reel, reelProfile)
          }
        } catch (e) {
          console.error(e)
        }
        await new Promise((r) => setTimeout(r, Math.max(0, delay * 1000 - (Date.now() - started))))
        finish(id, req.session, req.object, result, result ? 'mock' : 'fallback')
      })()
      return { ok: true }
    },
    async admin(passcode, action, extra) {
      if (passcode !== CONFIG.ADMIN_PASSCODE) {
        await new Promise((r) => setTimeout(r, 800))
        return { ok: false }
      }
      const db = read()
      if (action === 'reset') {
        db.altered = {}
        db.profile = emptyProfile()
        db.display = { ...HOME }
      } else if (action === 'skip' || action === 'clear_queue') {
        db.queue = action === 'skip' ? db.queue.filter((q) => q.id !== db.activeSession) : []
        db.activeSession = db.turnStartedAt = db.lastActivityAt = null
        db.profile = emptyProfile()
        db.display = { ...HOME }
      } else if (action === 'mock_on' || action === 'mock_off') {
        db.mockMode = action === 'mock_on'
      } else if (action === 'replicate_proxy' || action === 'replicate_direct') {
        db.replicateMode = action === 'replicate_direct' ? 'direct' : 'proxy'
      } else if (action === 'set_proxy_token' && extra?.token) {
        db.proxyToken = extra.token.trim()
        db.proxyTokenUpdatedAt = Date.now()
        db.proxyStatus = 'unknown'
      }
      if (action !== 'status') db.version++
      write(db, action !== 'status')
      const status: AdminStatus = {
        mockMode: db.mockMode, hasActive: !!db.activeSession, turnStartedAt: db.turnStartedAt,
        waiting: db.queue.filter((q) => q.id !== db.activeSession).length, busy: db.display.busy,
        open: db.display.open, alteredObjects: Object.keys(db.altered), today: today(db), serverNow: Date.now(),
        replicateMode: db.replicateMode ?? 'proxy',
        proxyStatus: db.proxyStatus ?? 'unknown',
        proxyTokenLast4: db.proxyToken && db.proxyToken.length >= 4 ? db.proxyToken.slice(-4) : null,
        proxyTokenUpdatedAt: db.proxyTokenUpdatedAt ?? null,
        proxyToday: 0,
        proxyQuota: CONFIG.PROXY_QUOTA_CHEAP,
      }
      if (action === 'test_ai') {
        return {
          ok: true,
          status,
          tests: {
            used: 0,
            rows: ['embed', 'text', 'vision', 'stt', 'image', 'tts'].map((job) => ({
              job, ok: true, skipped: true, ms: 0, source: 'skip', preview: 'local mode: no live AI',
            })),
          },
        }
      }
      return { ok: true, status }
    },
    onPoke(cb) {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    poke() {},
    reportReel(clip) {
      emitReelClip(clip)
      localStorage.setItem(REEL_KEY, JSON.stringify(clip))
      fire()
    },
    reportGame(state: GameWire) {
      emitGameWire(state)
      fire()
    },
  }
}
