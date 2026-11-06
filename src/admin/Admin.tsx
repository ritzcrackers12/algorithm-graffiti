import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { getBackend } from '../lib/backend.ts'
import { CONFIG } from '../shared/config.ts'
import type { AdminAction, AdminStatus } from '../shared/types.ts'

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

  const run = useCallback(
    async (action: AdminAction, code = pass) => {
      const b = await getBackend()
      setKind(b.kind)
      const res = await b.admin(code, action)
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

  const act = async (action: AdminAction, confirmText?: string) => {
    if (confirmText && !confirm(confirmText)) return
    setBusy(true)
    await run(action)
    setBusy(false)
  }

  if (!pass) {
    return (
      <div className="grid min-h-full place-items-center bg-[#0b0b10] p-6 text-white" style={{ fontFamily: 'Supreme, system-ui, sans-serif' }}>
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
          <button className="rounded-lg bg-[#c6ff3d] py-3 font-bold tracking-[0.2em] text-black">ENTER</button>
          {msg && <div className="text-sm text-[#ff2ea0]">{msg}</div>}
        </form>
      </div>
    )
  }

  const s = status
  const turnLeft = s?.turnStartedAt ? Math.max(0, Math.ceil((s.turnStartedAt + CONFIG.TURN_SECONDS * 1000 - s.serverNow) / 1000)) : null
  const btn = 'rounded-xl px-4 py-4 text-sm font-bold tracking-[0.15em] disabled:opacity-40'

  return (
    <div className="min-h-full bg-[#0b0b10] p-5 text-white" style={{ fontFamily: 'Supreme, system-ui, sans-serif' }}>
      <div className="mx-auto max-w-lg">
        <div className="mb-1 text-xs tracking-[0.3em] text-white/50">{CONFIG.TITLE}</div>
        <h1 className="mb-5 text-2xl font-extrabold tracking-[0.2em]">STAFF CONSOLE</h1>

        <div className="mb-5 rounded-2xl border border-white/15 bg-white/5 px-4 py-2">
          <Row k="LINK" v={kind === 'local' ? 'LOCAL MODE (this browser only)' : 'SUPABASE'} />
          <Row k="MOCK MODE" v={s ? (s.mockMode ? 'ON (no AI calls)' : 'OFF (live AI)') : '…'} />
          <Row k="OPERATOR" v={s ? (s.hasActive ? `ACTIVE · ${turnLeft}s left` : 'NONE') : '…'} />
          <Row k="WAITING IN QUEUE" v={s?.waiting ?? '…'} />
          <Row k="OPEN OBJECT" v={s?.open ?? 'DESKTOP'} />
          <Row k="PROCESSING" v={s?.busy ? `${s.busy.object.toUpperCase()}…` : 'IDLE'} />
          <Row k="ALTERED OBJECTS" v={s?.alteredObjects.length ? s.alteredObjects.join(', ').toUpperCase() : 'NONE'} />
          <Row
            k="GENERATIONS TODAY"
            v={s ? `${s.today.total} total · ${s.today.ai} AI / ${CONFIG.DAILY_GENERATION_CAP} cap · ${s.today.mock} mock · ${s.today.fallback} fallback` : '…'}
          />
          <Row k="RESET MODE" v={CONFIG.RESET_MODE.toUpperCase()} />
          <Row k="TURN / IDLE" v={`${CONFIG.TURN_SECONDS}s / ${CONFIG.IDLE_SECONDS}s`} />
        </div>

        <div className="grid grid-cols-1 gap-3">
          <button disabled={busy} className={`${btn} bg-[#ff2ea0]`} onClick={() => act('reset', 'Reset every object to its original?')}>
            RESET EVERYTHING TO ORIGINALS
          </button>
          <button disabled={busy || !s?.hasActive} className={`${btn} bg-white/10`} onClick={() => act('skip', 'Skip the current visitor?')}>
            SKIP CURRENT VISITOR
          </button>
          <button disabled={busy} className={`${btn} bg-white/10`} onClick={() => act('clear_queue', 'Remove everyone from the queue (including the current visitor)?')}>
            CLEAR QUEUE
          </button>
          <button
            disabled={busy || !s}
            className={`${btn} ${s?.mockMode ? 'bg-[#c6ff3d] text-black' : 'bg-white/10'}`}
            onClick={() => act(s?.mockMode ? 'mock_off' : 'mock_on', s?.mockMode ? 'Turn mock mode OFF? Real AI calls will cost money.' : undefined)}
          >
            {s?.mockMode ? 'TURN MOCK MODE OFF (USE REAL AI)' : 'TURN MOCK MODE ON'}
          </button>
        </div>

        {msg && <div className="mt-4 text-sm text-[#c6ff3d]">{msg}</div>}
        <div className="mt-8 flex gap-4 text-xs text-white/50">
          <a href="#/library" className="underline">LIBRARY</a>
          <a href="#/controller" className="underline">CONTROLLER</a>
          <button
            className="underline"
            onClick={() => {
              sessionStorage.removeItem(KEY)
              setPass('')
            }}
          >
            LOCK
          </button>
        </div>
      </div>
    </div>
  )
}
