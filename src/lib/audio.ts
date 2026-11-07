// iOS only allows sound after a tap. TAP TO BEGIN plays a silent clip on a
// persistent <video> in that gesture; later reels reuse the same element.
const BASE = import.meta.env.BASE_URL
const SILENCE = `${BASE}assets/silence.mp4`

let ctx: AudioContext | null = null
let unlocked = false
let out: GainNode | null = null
let kiosk: HTMLVideoElement | null = null
const wired = new WeakSet<HTMLMediaElement>()

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

export function kioskVideo() {
  if (!kiosk) {
    kiosk = document.createElement('video')
    kiosk.className = 'reel-video'
    kiosk.playsInline = true
    kiosk.preload = 'auto'
    kiosk.autoplay = true
    kiosk.controls = false
    kiosk.setAttribute('playsinline', 'true')
    kiosk.setAttribute('webkit-playsinline', 'true')
    kiosk.disablePictureInPicture = true
  }
  return kiosk
}

function park(v: HTMLVideoElement) {
  v.style.cssText = 'position:fixed;width:2px;height:2px;opacity:0;left:0;top:0;pointer-events:none;z-index:0'
  if (v.parentElement !== document.body) document.body.appendChild(v)
}

export function unlockAudio() {
  unlocked = true
  try {
    const { ctx: ac } = graph()
    void ac.resume()
    const buf = ac.createBuffer(1, 1, 22050)
    const src = ac.createBufferSource()
    src.buffer = buf
    src.connect(ac.destination)
    src.start(0)
  } catch { /* no Web Audio */ }

  const v = kioskVideo()
  park(v)
  v.loop = true
  v.muted = false
  v.defaultMuted = false
  v.volume = 1
  if (!v.getAttribute('src')) v.src = SILENCE
  void v.play().catch(() => {
    v.muted = true
    void v.play().then(() => {
      v.muted = false
    }).catch(() => {})
  })
  window.dispatchEvent(new Event('ag-media-unlock'))
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
  } catch { /* already connected or CORS */ }
  el.muted = false
  el.volume = 1
}

export function playKioskReel(src: string) {
  const v = kioskVideo()
  v.loop = false
  v.muted = false
  v.defaultMuted = false
  v.volume = 1
  v.style.cssText = ''
  if (src.startsWith('http') && !src.startsWith(location.origin)) {
    v.crossOrigin = 'anonymous'
  }
  const abs = new URL(src, location.href).href
  if (v.currentSrc !== abs) v.src = src
  const go = () => {
    attachReelOutput(v)
    return v.play()
  }
  return go().catch(() => {
    v.muted = true
    return v.play().then(() => {
      v.muted = false
      attachReelOutput(v)
      return v.play()
    })
  })
}

export function pauseKioskReel() {
  const v = kiosk
  if (!v) return
  v.pause()
  v.muted = true
  if (out) out.gain.value = 0
}

export function stopKioskReel() {
  pauseKioskReel()
  const v = kiosk
  if (!v) return
  v.loop = true
  v.removeAttribute('crossorigin')
  v.src = SILENCE
  park(v)
}

export const isAudioUnlocked = () => unlocked
export const getAudioContext = () => ctx
