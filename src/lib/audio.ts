// iOS only allows sound after a tap. The iPad's "tap to begin" calls unlockAudio() once;
// later modules (reels, songs) check isAudioUnlocked() before unmuting.
let ctx: AudioContext | null = null
let unlocked = false

export function unlockAudio() {
  try {
    ctx ??= new AudioContext()
    void ctx.resume()
    const buf = ctx.createBuffer(1, 1, 22050)
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.connect(ctx.destination)
    src.start(0)
    unlocked = true
  } catch {
    /* no Web Audio */
  }
}

export const isAudioUnlocked = () => unlocked
export const getAudioContext = () => ctx
