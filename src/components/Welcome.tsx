import { useEffect } from 'react'
import { haptic } from '../lib/haptics.ts'

// The welcome / instructions popup shown on scan — on the phone (with an OK
// button) and, mirrored, on the iPad (which tells you to tap OK on the phone).
// A voice reads it out starting 5s after it appears; dismissing stops the voice.
// Styled like the onboarding tour (neutral SaaS card) so it reads as instructions.

export const WELCOME_TEXT =
  "Welcome to Algorithm Graffiti! Put on your headphones and choose a piece of media to begin. As you move on, you will unlock more objects to interact with. Also, remember your phone is the controller, so there's no reason to touch the iPad."

function speakAfter(delayMs: number) {
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null
  if (!synth) return () => {}
  const t = setTimeout(() => {
    try {
      synth.cancel()
      const u = new SpeechSynthesisUtterance(WELCOME_TEXT)
      u.rate = 1
      synth.speak(u)
    } catch { /* no TTS available */ }
  }, delayMs)
  return () => {
    clearTimeout(t)
    try { synth.cancel() } catch { /* ignore */ }
  }
}

export function Welcome({ variant, onOk, speak = false }: { variant: 'phone' | 'ipad'; onOk?: () => void; speak?: boolean }) {
  // Only one device speaks (the iPad, which has an unlocked audio session from
  // TAP TO BEGIN — a freshly scanned phone can't autoplay speech reliably).
  useEffect(() => {
    if (!speak) return
    return speakAfter(5000)
  }, [speak])

  return (
    <div className="ob-scrim" aria-live="polite">
      <div className="ob-card pop-in" style={{ textAlign: 'center' }}>
        <div className="ob-title">Welcome to Algorithm Graffiti!</div>
        <div className="ob-body" style={{ maxWidth: 320 }}>
          Put on your headphones and choose a piece of media to begin. As you move on,
          you’ll unlock more objects to interact with. And remember: your phone is the
          controller, so there’s no reason to touch the iPad.
        </div>
        <div className="ob-nav" style={{ justifyContent: 'center' }}>
          {variant === 'phone' ? (
            <button
              className="ob-btn solid"
              type="button"
              onClick={() => { haptic('press'); onOk?.() }}
            >
              OK
            </button>
          ) : (
            <button className="ob-btn ghost" type="button" disabled style={{ cursor: 'default' }}>
              Tap OK on your phone
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
