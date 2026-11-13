import { useState } from 'react'
import { PixelButton } from '../components/PixelButton.tsx'
import { haptic } from '../lib/haptics.ts'

const SLIDES: { glyph: string; title: string; body: string }[] = [
  {
    glyph: '📱',
    title: 'TWO SCREENS.',
    body: 'This phone is your controller. The big screen in front of you is the display — whatever you do here shows up there. Keep this page open.',
  },
  {
    glyph: '🗂️',
    title: 'FOUR THINGS TO OPEN.',
    body: 'Articles, Videos, Radio, Messages. Tap an icon to open one on the big screen, then tune it and react right here on your phone.',
  },
  {
    glyph: '🎛️',
    title: 'IT ADJUSTS TO YOU.',
    body: 'Every choice feeds it. Drag the dials, swipe, text back — it keeps reshaping what it shows you.',
  },
  {
    glyph: '👁️',
    title: 'THEN IT READS YOU BACK.',
    body: 'Once you’ve touched enough, the big screen shows what it thinks it knows about you.',
  },
]

export default function Onboarding({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0)
  const last = i === SLIDES.length - 1
  const s = SLIDES[i]
  const go = (n: number) => { haptic('press'); setI(n) }
  return (
    <div className="onboard">
      <div className="onboard-card pop-in">
        {!last && (
          <button className="onboard-skip" type="button" onClick={() => { haptic('press'); onDone() }}>SKIP</button>
        )}
        <div className="onboard-glyph" aria-hidden>{s.glyph}</div>
        <div className="onboard-title ctl-display">{s.title}</div>
        <div className="onboard-body">{s.body}</div>
        <div className="onboard-dots">
          {SLIDES.map((_, n) => <span key={n} className={`onboard-dot ${n === i ? 'on' : ''}`} />)}
        </div>
        <div className="onboard-nav">
          {i > 0 && <PixelButton type="button" onClick={() => go(i - 1)}>BACK</PixelButton>}
          {last ? (
            <PixelButton block type="button" onClick={() => { haptic('success'); onDone() }}>LET’S GO</PixelButton>
          ) : (
            <PixelButton block type="button" onClick={() => go(i + 1)}>NEXT</PixelButton>
          )}
        </div>
      </div>
    </div>
  )
}
