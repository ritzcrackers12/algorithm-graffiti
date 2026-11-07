// LOCAL MODE: used when Supabase isn't configured (or with ?local in the URL).
// Mirrors the SQL rules in supabase/migrations using localStorage, so several tabs in the
// same browser can act as iPad + phones. Generation is always mock here.
import { pickAd, personalizeAd, weaveSponsored } from '../shared/ads.ts'
import { canonicalArticleParams, mockArticle, validateArticleParams } from '../shared/article.ts'
import { CONFIG, OBJECTS } from '../shared/config.ts'
import { resolveLocation } from '../shared/locations.ts'
import { emptyProfile, hydrateProfile, inferProfile, type VisitorProfile } from '../shared/profile.ts'
import type { AdminStatus, Altered, ArticleResult, DisplayState, Snapshot, Source } from '../shared/types.ts'
import type { Backend } from './backend.ts'
import { loadArticle } from './content.ts'

interface DB {
  activeSession: string | null
  turnStartedAt: number | null
  lastActivityAt: number | null
  display: DisplayState
  altered: Altered
  profile: VisitorProfile
  mockMode: boolean
  version: number
  queue: { id: string; joinedAt: number; lastSeen: number }[]
  generations: { id: number; at: number; object: string; source: string }[]
}

const KEY = 'ag-local-db-v2'
const HOME: DisplayState = { open: null, view: 'original', busy: null, openedAt: 0, completed: [], used: [], articleId: null }

function fresh(): DB {
  return {
    activeSession: null, turnStartedAt: null, lastActivityAt: null, display: { ...HOME }, altered: {}, profile: emptyProfile(),
    mockMode: true, version: 0, queue: [], generations: [],
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

  function finish(id: number, session: string, object: 'article', result: unknown, source: Source) {
    const db = read()
    const g = db.generations.find((x) => x.id === id)
    if (g) g.source = source
    const keep = db.activeSession === session || CONFIG.RESET_MODE === 'persist'
    if (db.display.busy?.id === id) db.display = { ...db.display, busy: null }
    if (keep && result) {
      db.altered = { ...db.altered, [object]: result as ArticleResult }
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
        const used = db.display.used ?? []
        db.display = {
          ...db.display,
          open: obj,
          view: obj === 'article' && db.altered.article ? 'altered' : 'original',
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
      const params = req.object === 'article' ? validateArticleParams(req.params) : null
      if (!params) return { ok: false, reason: 'invalid' }
      const db = read()
      if (db.activeSession !== req.session) return { ok: false, reason: 'not_active' }
      if (db.display.busy && db.display.busy.startedAt > Date.now() - 90_000) return { ok: false, reason: 'busy' }
      const last = db.generations.at(-1)
      if (last && last.at > Date.now() - CONFIG.RATE_LIMIT_SECONDS * 1000) {
        return { ok: false, reason: 'cooldown', secondsLeft: Math.ceil((last.at + CONFIG.RATE_LIMIT_SECONDS * 1000 - Date.now()) / 1000) }
      }
      const [lo, hi] = CONFIG.MOCK_DELAY_SECONDS
      const delay = Math.round(lo + Math.random() * (hi - lo))
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
          if (req.object === 'article') {
            const p = params
            const out = mockArticle(p, await loadArticle(p.articleId), resolveLocation(p.location))
            const profile = inferProfile({ ...emptyProfile(), ...db.profile, ...(req.profile ?? {}) })
            const match = pickAd(profile)
            const sponsored = match ? personalizeAd(match, profile) : undefined
            result = {
              params: canonicalArticleParams(p),
              ...out,
              body: sponsored ? weaveSponsored(out.body, sponsored.paragraph) : out.body,
              sponsored,
              source: 'mock',
              at: Date.now(),
            }
          }
        } catch (e) {
          console.error(e)
        }
        await new Promise((r) => setTimeout(r, Math.max(0, delay * 1000 - (Date.now() - started))))
        finish(id, req.session, req.object, result, result ? 'mock' : 'fallback')
      })()
      return { ok: true }
    },
    async admin(passcode, action) {
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
      }
      if (action !== 'status') db.version++
      write(db, action !== 'status')
      const status: AdminStatus = {
        mockMode: db.mockMode, hasActive: !!db.activeSession, turnStartedAt: db.turnStartedAt,
        waiting: db.queue.filter((q) => q.id !== db.activeSession).length, busy: db.display.busy,
        open: db.display.open, alteredObjects: Object.keys(db.altered), today: today(db), serverNow: Date.now(),
      }
      return { ok: true, status }
    },
    onPoke(cb) {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    poke() {},
  }
}
