import { useState } from 'react'
import { cleanShortText, isBlocked } from '../shared/text.ts'
import type { Snapshot, WebsiteParams } from '../shared/types.ts'
import { COUNTRY_MODELS, DEFAULT_WEBSITE_PARAMS, ERAS, MOOD_LABELS } from '../shared/website.ts'
import { haptic } from '../lib/haptics.ts'
import { DetentSlider, Knob, Section } from './controls.tsx'
import type { Transmit } from './Controller.tsx'
import { useControls } from './useControls.ts'

function Flag({ colors, symbol }: { colors: readonly string[]; symbol: string }) {
  return (
    <svg viewBox="0 0 60 40" width="45" height="30" style={{ borderRadius: 4, boxShadow: '0 2px 6px rgba(0,0,0,0.5)' }}>
      {colors.map((c, i) => <rect key={i} x={i * 20} y="0" width="20.5" height="40" fill={c} />)}
      <text x="30" y="27" textAnchor="middle" fontSize="18" fontWeight="900" fill={colors[1] === '#ffffff' || colors[1] === '#d9d9d9' ? '#111' : '#fff'}>{symbol}</text>
    </svg>
  )
}

export default function WebsiteControls({
  snap, locked, transmit, say,
}: { snap: Snapshot; locked: boolean; transmit: Transmit; say: (t: string) => void }) {
  const [p, set] = useControls<WebsiteParams>('website', snap.turnStartedAt, () => ({
    ...DEFAULT_WEBSITE_PARAMS,
    ...(snap.altered.website?.params ?? {}),
  }))
  const [typing, setTyping] = useState(false)
  const [draft, setDraft] = useState(p.countryText)

  const confirmTyped = () => {
    const t = cleanShortText(draft, 40)
    if (!t || isBlocked(t)) {
      haptic('error')
      say(t ? 'INPUT REJECTED. TERM NOT PERMITTED.' : 'INPUT REJECTED. LETTERS ONLY, MAX 40.')
      return
    }
    haptic('success')
    set({ country: 'custom', countryText: t })
    setTyping(false)
  }

  return (
    <>
      <Section label="ERA" value={String(p.era)} style={{ padding: "12px 14px 0" }}>
        <Knob steps={ERAS.map(String)} value={ERAS.indexOf(p.era)} onChange={(i) => set({ era: ERAS[i] })} size={88} disabled={locked} />
      </Section>

      <Section label="COUNTRY MODEL" value={p.country === 'custom' ? 'CUSTOM' : undefined}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {COUNTRY_MODELS.map((c) => (
            <button
              key={c.id}
              disabled={locked}
              className={`flag-btn ${p.country === c.id ? 'on' : ''}`}
              onClick={() => {
                haptic('tick')
                set({ country: c.id })
              }}
            >
              <Flag colors={c.flag} symbol={c.symbol} />
              <span>{c.label}</span>
            </button>
          ))}
        </div>
        <button
          disabled={locked}
          className={`flag-btn ${p.country === 'custom' ? 'on' : ''}`}
          style={{ width: '100%', marginTop: 8, flexDirection: 'row', justifyContent: 'center', minHeight: 48 }}
          onClick={() => {
            haptic('press')
            setDraft(p.countryText)
            setTyping(true)
          }}
        >
          <span style={{ fontSize: 12, minHeight: 0 }}>
            {p.country === 'custom' ? `✎ ${p.countryText.toUpperCase()}` : '✎ TYPE YOUR OWN MODEL'}
          </span>
        </button>
      </Section>

      <Section label="MOOD" value={MOOD_LABELS[p.mood]}>
        <DetentSlider
          steps={5}
          value={p.mood}
          onChange={(v) => set({ mood: v })}
          disabled={locked}
          track="linear-gradient(90deg, #3a3a44, #3b5bdb 28%, #9a9aa8 50%, #ffb020 75%, #ff2ea0)"
          left="DESPAIR"
          right="ELATION"
        />
      </Section>

      <button className="big-btn sticky-cta" disabled={locked} onClick={() => transmit({ object: 'website', params: p })}>
        REBUILD WEBSITE
      </button>

      {typing && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'flex-start', padding: '22vh 18px 0' }}
          onClick={(e) => e.target === e.currentTarget && setTyping(false)}
        >
          <div className="panel pop-in" style={{ width: '100%', padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="ctl-label">DEFINE GOVERNANCE MODEL.</div>
            <input
              autoFocus
              value={draft}
              maxLength={40}
              placeholder="e.g. TOTAL SURVEILLANCE"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && confirmTyped()}
              style={{
                touchAction: 'manipulation', fontSize: 18, padding: '14px 14px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.3)',
                background: 'rgba(255,255,255,0.08)', color: '#fff', font: '700 18px/1.2 var(--font-mono)', letterSpacing: 1, outline: 'none',
              }}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button className="big-btn ghost" style={{ minHeight: 54, fontSize: 15 }} onClick={() => setTyping(false)}>CANCEL</button>
              <button className="big-btn" style={{ minHeight: 54, fontSize: 15 }} onClick={confirmTyped}>CONFIRM</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
