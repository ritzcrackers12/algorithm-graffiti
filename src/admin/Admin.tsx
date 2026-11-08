import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { PixelButton } from '../components/PixelButton.tsx'
import { getBackend } from '../lib/backend.ts'
import { CONFIG } from '../shared/config.ts'
import type { AdminAction, AdminStatus, AiTestRow } from '../shared/types.ts'

const KEY = 'ag-admin-pass'

function Row({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-white/10 py-2 text-sm">
      <span className="text-white/60">{k}</span>
      <span className="text-right font-bold">{v}</span>
    </div>
  )
}

export default function Admin() {
  const [pass, setPass] = useState(() => sessionStorage.getItem(KEY) ?? '')
  const [draft, setDraft] = useState('')
  const [status, setStatus] = useState<AdminStatus | null>(null)
  const [kind, setKind] = useState<string>('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [tokenDraft, setTokenDraft] = useState('')
  const [tests, setTests] = useState<{ rows: AiTestRow[]; used: number } | null>(null)

  const run = useCallback(
    async (action: AdminAction, code = pass) => {
      const b = await getBackend()
      setKind(b.kind)
      const res = await b.admin(code, action) as { ok: boolean; status?: AdminStatus; tests?: { rows: AiTestRow[]; used: number } }
      if (!res.ok || !res.status) {
        if (action === 'status' && code) {
          sessionStorage.removeItem(KEY)
          setPass('')
          setMsg('ACCESS DENIED.')
        } else setMsg('COMMAND FAILED.')
        return false
      }
      setStatus(res.status)
      if (action !== 'status') {
        b.poke()
        setMsg(`EXECUTED: ${action.toUpperCase().replace('_', ' ')}.`)
      }
      return true
    },
    [pass],
  )

  useEffect(() => {
    if (!pass) return
    void run('status')
    const t = setInterval(() => void run('status'), 3000)
    return () => clearInterval(t)
  }, [pass, run])

  const act = async (action: AdminAction, confirmText?: string, extra?: { token?: string; all?: boolean }) => {
    if (confirmText && !confirm(confirmText)) return
    setBusy(true)
    const b = await getBackend()
    setKind(b.kind)
    const res = await b.admin(pass, action, extra)
    if (res.ok && res.status) {
      setStatus(res.status)
      if (action !== 'status') setMsg(`EXECUTED: ${action.toUpperCase().replace('_', ' ')}.`)
      if (res.tests) setTests(res.tests as { rows: AiTestRow[]; used: number })
    } else setMsg('COMMAND FAILED.')
    setBusy(false)
  }

  if (!pass) {
    return (
      <div className="theme-surveillance grid min-h-full place-items-center bg-[#0b0b10] p-6 text-white" style={{ fontFamily: 'Supreme, system-ui, sans-serif' }}>
        <form
          className="flex w-full max-w-xs flex-col gap-3"
          onSubmit={async (e) => {
            e.preventDefault()
            setMsg('')
            if (await run('status', draft)) {
              sessionStorage.setItem(KEY, draft)
              setPass(draft)
            } else setMsg('ACCESS DENIED.')
          }}
        >
          <div className="text-xs tracking-[0.3em] text-white/60">STAFF ACCESS</div>
          <input
            type="password"
            inputMode="numeric"
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-lg outline-none"
            placeholder="PASSCODE"
          />
          <PixelButton type="submit" block>ENTER</PixelButton>
          {msg && <div className="text-sm text-[#ff2ea0]">{msg}</div>}
        </form>
      </div>
    )
  }

  const s = status

  return (
    <div className="theme-surveillance min-h-full bg-[#0b0b10] p-5 text-white" style={{ fontFamily: 'Supreme, system-ui, sans-serif' }}>
      <div className="mx-auto max-w-lg">
        <div className="mb-1 text-xs tracking-[0.3em] text-white/50">{CONFIG.TITLE}</div>
        <h1 className="mb-5 text-2xl font-extrabold tracking-[0.2em]">STAFF CONSOLE</h1>

        <div className="mb-5 rounded-2xl border border-white/15 bg-white/5 px-4 py-2">
          <Row k="LINK" v={kind === 'local' ? 'LOCAL MODE (this browser only)' : 'SUPABASE'} />
          <Row k="MOCK MODE" v={s ? (s.mockMode ? 'ON (no AI calls)' : 'OFF (live AI)') : '…'} />
          <Row k="OPERATOR" v={s ? (s.hasActive ? 'ACTIVE' : 'NONE') : '…'} />
          <Row k="WAITING IN QUEUE" v={s?.waiting ?? '…'} />
          <Row k="OPEN OBJECT" v={s?.open ?? 'DESKTOP'} />
          <Row k="PROCESSING" v={s?.busy ? `${s.busy.object.toUpperCase()}…` : 'IDLE'} />
          <Row k="ALTERED OBJECTS" v={s?.alteredObjects.length ? s.alteredObjects.join(', ').toUpperCase() : 'NONE'} />
          <Row
            k="GENERATIONS TODAY"
            v={s ? `${s.today.total} total · ${s.today.ai} AI / ${CONFIG.DAILY_GENERATION_CAP} cap · ${s.today.mock} mock · ${s.today.fallback} fallback` : '…'}
          />
          <Row k="RESET MODE" v={CONFIG.RESET_MODE.toUpperCase()} />
          <Row k="TURN / IDLE" v={`NONE / ${CONFIG.IDLE_SECONDS}s (hidden)`} />
        </div>

        <div className="mb-5 rounded-2xl border border-white/15 bg-white/5 px-4 py-2">
          <Row
            k="AI LINK"
            v={
              !s ? '…'
                : (s.replicateMode === 'proxy' && (s.proxyToday ?? 0) >= (s.proxyQuota ?? 500)) || s.proxyStatus === 'limit' ? 'DAILY LIMIT REACHED'
                  : s.proxyStatus === 'expired' ? 'TOKEN EXPIRED'
                    : s.proxyStatus === 'ok' ? 'PROXY OK'
                      : s.replicateMode === 'direct' ? 'DIRECT (no proxy status yet)'
                        : 'UNKNOWN'
            }
          />
          <Row k="REPLICATE MODE" v={s ? (s.replicateMode ?? CONFIG.REPLICATE_MODE).toUpperCase() : '…'} />
          <Row
            k="EXHIBIT TODO"
            v={s?.replicateMode === 'direct'
              ? 'DIRECT. KEEP REPLICATE_API_KEY AS A SUPABASE SECRET.'
              : 'BEFORE NOV 16: SWITCH TO DIRECT + SET REPLICATE_API_KEY. PROXY TOKEN EXPIRES ~HOURLY.'}
          />
          <Row k="CHAT LLM" v="CHAT_PROVIDER / CHAT_API_KEY / CHAT_MODEL SECRETS ON THE CHAT FUNCTION." />
          <Row
            k="PROXY TOKEN"
            v={s?.proxyTokenLast4
              ? `••••${s.proxyTokenLast4}${s.proxyTokenUpdatedAt ? ` · ${new Date(s.proxyTokenUpdatedAt).toLocaleString()}` : ''}`
              : 'NOT SET'}
          />
          <Row
            k="PROXY TODAY"
            v={s
              ? `${s.proxyToday ?? 0} used · ${Math.max(0, (s.proxyQuota ?? CONFIG.PROXY_QUOTA_CHEAP) - (s.proxyToday ?? 0))} of ${s.proxyQuota ?? CONFIG.PROXY_QUOTA_CHEAP} cheap left`
              : '…'}
          />
          <form
            className="flex flex-col gap-2 py-3"
            onSubmit={(e) => {
              e.preventDefault()
              const t = tokenDraft.trim()
              if (t.length < 8) { setMsg('TOKEN TOO SHORT.'); return }
              void act('set_proxy_token', undefined, { token: t }).then(() => setTokenDraft(''))
            }}
          >
            <input
              type="password"
              value={tokenDraft}
              onChange={(e) => setTokenDraft(e.target.value)}
              placeholder="PASTE PROXY TOKEN"
              className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm outline-none"
              autoComplete="off"
            />
            <PixelButton type="submit" block disabled={busy}>
              SAVE PROXY TOKEN
            </PixelButton>
          </form>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <PixelButton block disabled={busy} onClick={() => act('reset', 'Reset every object to its original?')}>
            RESET EVERYTHING TO ORIGINALS
          </PixelButton>
          <PixelButton block disabled={busy || !s?.hasActive} onClick={() => act('skip', 'Skip the current visitor?')}>
            SKIP CURRENT VISITOR
          </PixelButton>
          <PixelButton block disabled={busy} onClick={() => act('clear_queue', 'Remove everyone from the queue (including the current visitor)?')}>
            CLEAR QUEUE
          </PixelButton>
          <PixelButton
            block
            disabled={busy || !s}
            selected={!!s?.mockMode}
            onClick={() => act(s?.mockMode ? 'mock_off' : 'mock_on', s?.mockMode ? 'Turn mock mode OFF? Real AI calls will cost money.' : undefined)}
          >
            {s?.mockMode ? 'TURN MOCK MODE OFF (USE REAL AI)' : 'TURN MOCK MODE ON'}
          </PixelButton>
          <PixelButton
            block
            disabled={busy || !s}
            selected={s?.replicateMode === 'proxy'}
            onClick={() => act(s?.replicateMode === 'proxy' ? 'replicate_direct' : 'replicate_proxy')}
          >
            {s?.replicateMode === 'proxy' ? 'SWITCH TO DIRECT REPLICATE' : 'SWITCH TO NYU PROXY'}
          </PixelButton>
          <PixelButton block disabled={busy} onClick={() => act('test_ai')}>
            RUN AI TEST (1 TEXT CALL IF TOKEN SAVED)
          </PixelButton>
        </div>

        {msg && <div className="mt-4 text-sm text-[#c6ff3d]">{msg}</div>}
        {tests && (
          <div className="mt-4 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-xs">
            <div className="mb-2 tracking-[0.2em] text-white/50">AI TEST · {tests.used} PROXY CALLS</div>
            {tests.rows.map((r) => (
              <div key={r.job} className="border-b border-white/10 py-2 font-mono">
                {r.skipped ? 'SKIP' : r.ok ? 'PASS' : 'FAIL'} · {r.job} · {r.ms}ms · {r.source}
                {r.preview ? ` · ${r.preview}` : ''}
                {r.error ? ` · ${r.error}` : ''}
              </div>
            ))}
          </div>
        )}
        <div className="mt-8 flex gap-4 text-xs text-white/50">
          <a href="#/library" className="underline">LIBRARY</a>
          <a href="#/controller" className="underline">CONTROLLER</a>
          <PixelButton
            onClick={() => {
              sessionStorage.removeItem(KEY)
              setPass('')
            }}
          >
            LOCK
          </PixelButton>
        </div>
      </div>
    </div>
  )
}
