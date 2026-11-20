// Tiny text-to-speech helper for reading instructions aloud on the phone.
// iOS only allows speech after it has been started once inside a tap, so
// primeSpeech() is called from the first touch on the page.
let primed = false

function synth() {
  return typeof window !== 'undefined' ? window.speechSynthesis ?? null : null
}

function voice() {
  const vs = synth()?.getVoices() ?? []
  return vs.find((v) => /en[-_]US/i.test(v.lang) && /samantha|google/i.test(v.name))
    || vs.find((v) => /en[-_]US/i.test(v.lang))
    || vs.find((v) => /^en/i.test(v.lang))
    || null
}

export function primeSpeech() {
  const s = synth()
  if (!s || primed) return
  primed = true
  try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; s.speak(u) } catch { /* no TTS */ }
}

export function say(text: string) {
  const s = synth()
  if (!s) return
  try {
    s.cancel()
    const u = new SpeechSynthesisUtterance(text)
    const v = voice()
    if (v) u.voice = v
    u.rate = 1
    s.speak(u)
  } catch { /* no TTS */ }
}

export function hush() {
  try { synth()?.cancel() } catch { /* ignore */ }
}
