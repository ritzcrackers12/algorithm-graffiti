import { OBJECTS } from '../shared/config.ts'
import type { Busy } from '../shared/types.ts'
import { useNow } from '../lib/live.ts'
import { XpWindow } from './XpWindow.tsx'

const PHASES: Record<string, string[]> = {
  article: ['PARSING SOURCE TEXT', 'APPLYING INPUT PARAMETERS', 'WRITING OUTPUT'],
  default: ['ANALYZING INPUT', 'WRITING OUTPUT'],
}

export default function ProgressDialog({ busy }: { busy: Busy }) {
  const now = useNow(200)
  const elapsed = Math.max(0, (now - busy.startedAt) / 1000)
  const eta = Math.max(1, busy.etaSeconds)
  const remaining = Math.max(0, Math.ceil(eta - elapsed))
  const frac = Math.min(0.96, 1 - Math.exp((-2.2 * elapsed) / eta))
  const phases = PHASES[busy.object] ?? PHASES.default
  const phase = phases[Math.min(phases.length - 1, Math.floor((elapsed / eta) * phases.length))]
  const label = OBJECTS.find((o) => o.id === busy.object)?.file ?? busy.object
  const line = remaining > 0 ? `${phase}. ${remaining} SECOND${remaining === 1 ? '' : 'S'} REMAINING.` : 'FINALIZING. STAND BY.'

  return (
    <div className="xp-dialog-shade">
      <div className="xp-dialog">
        <XpWindow title={`Processing ${label}`} menu={null} closeOnly>
          <div style={{ padding: '22px 22px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden>
                <rect x="4" y="8" width="30" height="24" rx="2" fill="#fff" stroke="#235bd6" strokeWidth="2" />
                <rect x="10" y="14" width="30" height="24" rx="2" fill="#dfe9ff" stroke="#235bd6" strokeWidth="2" />
                <path d="M16 26 h18 M16 31 h12" stroke="#235bd6" strokeWidth="2" />
              </svg>
              <div className="machine-line">{line}</div>
            </div>
            <div className="xp-progress">
              <div className="xp-progress-fill" style={{ width: `${(remaining > 0 ? frac : 0.97) * 100}%` }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: '#444' }}>Input received from remote operator.</span>
              <button className="xp-button" disabled>Cancel</button>
            </div>
          </div>
        </XpWindow>
      </div>
    </div>
  )
}
