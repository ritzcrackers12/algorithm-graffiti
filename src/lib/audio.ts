// iOS only allows sound after a tap. The iPad's "tap to begin" calls unlockAudio() once;
// later modules (reels, songs) check isAudioUnlocked() before unmuting.
// Video audio is routed through Web Audio so the iPad silent switch does not mute the reel.
let ctx: AudioContext | null = null
let unlocked = false
let out: GainNode | null = null
let bed: HTMLAudioElement | null = null
const wired = new WeakSet<HTMLMediaElement>()

const SILENT_WAV = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA'

function graph() {
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  ctx ??= new AC()
  if (!out) {
    out = ctx.createGain()
    out.gain.value = 1
    out.connect(ctx.destination)
  }
  return { ctx, out }
}

export function unlockAudio() {
  try {
    const { ctx: ac } = graph()
    void ac.resume()
    const buf = ac.createBuffer(1, 1, 22050)
    const src = ac.createBufferSource()
    src.buffer = buf
    src.connect(ac.destination)
    src.start(0)
    if (!bed) {
      bed = new Audio(SILENT_WAV)
      bed.loop = true
      bed.volume = 0.01
    }
    void bed.play().catch(() => {})
    unlocked = true
    window.dispatchEvent(new Event('ag-media-unlock'))
  } catch {
    unlocked = true
    window.dispatchEvent(new Event('ag-media-unlock'))
  }
}

export function attachReelOutput(el: HTMLMediaElement) {
  try {
    const { ctx: ac, out: gain } = graph()
    void ac.resume()
    gain.gain.value = 1
    if (!wired.has(el)) {
      ac.createMediaElementSource(el).connect(gain)
      wired.add(el)
    }
  } catch {
    /* already connected or unsupported */
  }
  el.muted = false
  el.volume = 1
}

export function silenceReelOutput() {
  if (out) out.gain.value = 0
}

export const isAudioUnlocked = () => unlocked
export const getAudioContext = () => ctx
