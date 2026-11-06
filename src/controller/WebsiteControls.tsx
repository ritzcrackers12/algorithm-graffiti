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
    <svg viewBox="0 0 60 40" width="36" height="24" aria-hidden>
      {colors.map((c, i) => <rect key={i} x={i * 20} y="0" width="20.5" height="40" fill={c} />)}
      <text x="30" y="27" textAnchor="middle" fontSize="16" fontWeight="800" fill={colors[1] === '#ffffff' || colors[1] === '#d9d9d9' ? '#111' : '#fff'}>{symbol}</text>
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
  const countryName = p.country === 'custom' ? p.countryText.toUpperCase() : (COUNTRY_MODELS.find((c) => c.id === p.country)?.label ?? '')

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
    <div className="ctl-board">
      <div className="knob-row">
        <Section stack label="ERA" value={String(p.era)}>
          <Knob steps={ERAS.map(String)} value={ERAS.indexOf(p.era)} onChange={(i) => set({ era: ERAS[i] })} size={68} disabled={locked} />
        </Section>
        <Section stack label="MOOD" value={MOOD_LABELS[p.mood]}>
          <div style={{ width: '100%', padding: '8px 4px 0' }}>
            <DetentSlider
              steps={5}
              value={p.mood}
              onChange={(v) => set({ mood: v })}
              disabled={locked}
              track="linear-gradient(90deg, #3a3a44, #3b5bdb 28%, #9a9aa8 50%, #c9a227 75%, #c45c2a)"
            />
          </div>
        </Section>
      </div>

      <Section label="COUNTRY MODEL" value={countryName}>
        <div className="flag-grid">
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
          className={`flag-btn custom-model ${p.country === 'custom' ? 'on' : ''}`}
          onClick={() => {
            haptic('press')
            setDraft(p.countryText)
            setTyping(true)
          }}
        >
          {p.country === 'custom' ? `CUSTOM · ${p.countryText.toUpperCase()}` : 'TYPE YOUR OWN MODEL'}
        </button>
      </Section>

      <button className="big-btn" disabled={locked} onClick={() => transmit({ object: 'website', params: p })}>
        REBUILD WEBSITE
      </button>

      {typing && (
        <div className="sheet ctl-allow-scroll" onClick={(e) => e.target === e.currentTarget && setTyping(false)}>
          <div className="panel pop-in sheet-card">
            <div className="ctl-label">DEFINE GOVERNANCE MODEL.</div>
            <input
              autoFocus
              value={draft}
              maxLength={40}
              placeholder="e.g. TOTAL SURVEILLANCE"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && confirmTyped()}
              className="metal-input"
            />
            <div className="sheet-actions">
              <button className="big-btn ghost" onClick={() => setTyping(false)}>CANCEL</button>
              <button className="big-btn" onClick={confirmTyped}>CONFIRM</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
