// iPad Safari will not unmute a later <video> unless audible media started
// in the TAP TO BEGIN gesture. We keep one <audio> alive from that tap and
// swap its src to same-origin reel AAC. The picture can stay a muted <video>.
const BASE = import.meta.env.BASE_URL
const UNLOCK = `${BASE}assets/unlock.m4a`

let ctx: AudioContext | null = null
let unlocked = false
let audio: HTMLAudioElement | null = null
let video: HTMLVideoElement | null = null

function graph() {
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  ctx ??= new AC()
  return ctx
}

export function kioskVideo() {
  if (!video) {
    video = document.createElement('video')
    video.className = 'reel-video'
    video.playsInline = true
    video.preload = 'auto'
    video.autoplay = true
    video.muted = true
    video.defaultMuted = true
    video.controls = false
    video.setAttribute('playsinline', 'true')
    video.setAttribute('webkit-playsinline', 'true')
    video.disablePictureInPicture = true
  }
  return video
}

function kioskAudio() {
  if (!audio) {
    audio = new Audio()
    audio.preload = 'auto'
    audio.loop = false
    audio.playsInline = true
  }
  return audio
}

export function reelAudioFile(id: string) {
  return `${BASE}content/reel-audio/${id}.m4a`
}

export function unlockAudio() {
  unlocked = true
  try {
    const ac = graph()
    void ac.resume()
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    gain.gain.value = 0.12
    osc.frequency.value = 880
    osc.connect(gain)
    gain.connect(ac.destination)
    osc.start()
    osc.stop(ac.currentTime + 0.16)
  } catch { /* no Web Audio */ }

  const a = kioskAudio()
  a.loop = false
  a.muted = false
  a.volume = 1
  a.src = UNLOCK
  void a.play().catch(() => {})

  const v = kioskVideo()
  v.muted = true
  void v.play().catch(() => {})

  window.dispatchEvent(new Event('ag-media-unlock'))
}

export function playKioskReel(videoSrc: string, audioSrc: string) {
  const v = kioskVideo()
  const a = kioskAudio()
  v.muted = true
  v.loop = false
  v.style.cssText = ''
  if (v.currentSrc !== new URL(videoSrc, location.href).href) v.src = videoSrc
  void v.play().catch(() => {})

  a.loop = false
  a.muted = false
  a.volume = 1
  const abs = new URL(audioSrc, location.href).href
  if (a.src !== abs) {
    a.src = audioSrc
  }
  a.currentTime = 0
  return a.play().catch(() => {
    a.muted = false
    return a.play()
  })
}

export function syncKioskAudio(seconds: number) {
  if (!audio || audio.paused) return
  if (Math.abs(audio.currentTime - seconds) > 0.35) {
    try { audio.currentTime = seconds } catch { /* ignore */ }
  }
}

export function pauseKioskReel() {
  video?.pause()
  if (audio) {
    audio.pause()
    audio.volume = 0
  }
}

export function stopKioskReel() {
  pauseKioskReel()
  if (audio) {
    audio.removeAttribute('src')
    audio.load()
  }
}

export const isAudioUnlocked = () => unlocked
export const getAudioContext = () => ctx
