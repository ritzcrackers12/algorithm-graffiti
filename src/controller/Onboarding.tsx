import { useState, type ReactNode } from 'react'
import { haptic } from '../lib/haptics.ts'

/* A deliberately plain, unthemed product tour. It should read like any SaaS
 * onboarding — neutral card, system font, one idea per slide — so visitors
 * treat it as instructions, not as part of the piece. Reused for the intro and
 * for each individual controller's walkthrough. */

function PhoneIcon() {
  return (
    <svg viewBox="0 0 64 44" width="64" height="44" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="8" width="22" height="34" rx="3" />
      <line x1="9" y1="38" x2="17" y2="38" />
      <rect x="34" y="4" width="28" height="22" rx="2" />
      <line x1="48" y1="26" x2="48" y2="32" /><line x1="42" y1="32" x2="54" y2="32" />
      <path d="M26 20 h6 m0 0 l-2.5 -2.5 M32 20 l-2.5 2.5" />
    </svg>
  )
}

function DialSliderIcon() {
  return (
    <svg viewBox="0 0 64 44" width="64" height="44" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="22" r="13" />
      <line x1="18" y1="22" x2="25" y2="13" />
      <path d="M31 9 a17 17 0 0 1 0 26" strokeDasharray="2 3" opacity="0.6" />
      <line x1="44" y1="30" x2="62" y2="30" />
      <circle cx="54" cy="30" r="4.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg viewBox="0 0 64 44" width="64" height="44" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="16" y="26" width="32" height="12" rx="3" />
      <path d="M22 32 h20" opacity="0.5" />
      <path d="M30 6 l16 8 -16 8 z" />
      <line x1="30" y1="14" x2="40" y2="14" />
    </svg>
  )
}

function MessageIcon() {
  return (
    <svg viewBox="0 0 64 44" width="64" height="44" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 8 h48 a4 4 0 0 1 4 4 v18 a4 4 0 0 1 -4 4 H26 l-10 8 v-8 h-8 a4 4 0 0 1 -4 -4 V12 a4 4 0 0 1 4 -4 z" />
      <line x1="16" y1="18" x2="48" y2="18" opacity="0.6" /><line x1="16" y1="25" x2="38" y2="25" opacity="0.6" />
    </svg>
  )
}

/** Icon used across an app's walkthrough slides, for visual continuity. */
export function AppIcon({ id }: { id: string }) {
  if (id === 'chat') return <MessageIcon />
  return <DialSliderIcon />
}

export type Slide = { icon?: ReactNode; title: string; body: string }

export function Tour({ slides, onDone }: { slides: Slide[]; onDone: () => void }) {
  const [i, setI] = useState(0)
  const last = i === slides.length - 1
  const s = slides[i]
  const go = (n: number) => { haptic('press'); setI(n) }
  return (
    <div className="ob-scrim">
      <div className="ob-card pop-in">
        {!last && (
          <button className="ob-skip" type="button" onClick={() => { haptic('press'); onDone() }}>Skip</button>
        )}
        <div className="ob-slide" key={i}>
          {s.icon && <div className="ob-icon" aria-hidden>{s.icon}</div>}
          <div className="ob-title">{s.title}</div>
          <div className="ob-body">{s.body}</div>
        </div>
        <div className="ob-dots">
          {slides.map((_, n) => <span key={n} className={`ob-dot ${n === i ? 'on' : ''}`} />)}
        </div>
        <div className="ob-nav">
          {i > 0 && (
            <button className="ob-btn ghost" type="button" onClick={() => go(i - 1)}>Back</button>
          )}
          {last ? (
            <button className="ob-btn solid" type="button" onClick={() => { haptic('success'); onDone() }}>Got it</button>
          ) : (
            <button className="ob-btn solid" type="button" onClick={() => go(i + 1)}>Next</button>
          )}
        </div>
      </div>
    </div>
  )
}

const INTRO: Slide[] = [
  {
    icon: <PhoneIcon />,
    title: 'Your phone is the remote',
    body: 'Tap a tile to open it on the big screen. Anything you change on your phone updates there as you go.',
  },
  {
    icon: <DialSliderIcon />,
    title: 'Dials and sliders',
    body: 'Turn a dial by dragging around it. Drag a slider left or right. The big screen previews each change.',
  },
  {
    icon: <SendIcon />,
    title: 'Send it when it looks right',
    body: 'Tap the button at the bottom — SUBMIT, SEND or TUNE IN — to lock in your choices. In Videos you can swipe and react; in Messages, just type back.',
  },
]

export default function Onboarding({ onDone }: { onDone: () => void }) {
  return <Tour slides={INTRO} onDone={onDone} />
}
