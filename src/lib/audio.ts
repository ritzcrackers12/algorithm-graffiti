// iPad Safari will not start a new audible <video> after TAP TO BEGIN.
// Keep one HTMLAudioElement looping same-origin silence from that tap, then
// play reel AAC through the already-running AudioContext (silent-switch safe).
const BASE = import.meta.env.BASE_URL
const UNLOCK = `${BASE}assets/unlock.m4a`
const SILENCE = `${BASE}assets/silence.m4a`

let ctx: AudioContext | null = null
let unlocked = false
let audio: HTMLAudioElement | null = null
let video: HTMLVideoElement | null = null
let master: GainNode | null = null
let bed: OscillatorNode | null = null
let clipNode: AudioBufferSourceNode | null = null
let clipBuf: AudioBuffer | null = null
let clipOffset = 0
let armed = false
const buffers = new Map<string, AudioBuffer>()

function graph() {
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  ctx ??= new AC()
  if (!master) {
    master = ctx.createGain()
    master.gain.value = 1
    master.connect(ctx.destination)
  }
  return ctx
}

function armResume() {
  if (armed) return
  armed = true
  const kick = () => {
    void graph().resume()
    const a = audio
    if (a && a.paused && unlocked) void a.play().catch(() => {})
  }
  document.addEventListener('pointerdown', kick)
  document.addEventListener('touchstart', kick, { passive: true })
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') kick()
  })
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
    audio.loop = true
    audio.crossOrigin = 'anonymous'
    audio.setAttribute('playsinline', 'true')
    audio.setAttribute('webkit-playsinline', 'true')
  }
  return audio
}

export function reelAudioFile(id: string) {
  return `${BASE}content/reel-audio/${id}.m4a`
}

function stopClip() {
  if (clipNode) {
    try { clipNode.stop() } catch { /* already stopped */ }
    try { clipNode.disconnect() } catch { /* ignore */ }
    clipNode = null
  }
  clipBuf = null
  clipOffset = 0
}

async function loadBuffer(src: string) {
  const hit = buffers.get(src)
  if (hit) return hit
  const res = await fetch(src)
  if (!res.ok) throw new Error(`audio ${res.status}`)
  const raw = await res.arrayBuffer()
  const buf = await graph().decodeAudioData(raw.slice(0))
  buffers.set(src, buf)
  return buf
}

function startClip(buf: AudioBuffer, offset: number) {
  stopClip()
  const ac = graph()
  void ac.resume()
  const off = Math.max(0, Math.min(offset, Math.max(0, buf.duration - 0.04)))
  const node = ac.createBufferSource()
  node.buffer = buf
  node.connect(master!)
  node.start(0, off)
  clipNode = node
  clipBuf = buf
  clipOffset = ac.currentTime - off
}

function holdSilence() {
  const a = kioskAudio()
  a.loop = true
  a.muted = false
  a.volume = 1
  const abs = new URL(SILENCE, location.href).href
  if (a.src !== abs) a.src = SILENCE
  void a.play().catch(() => {})
}

export function unlockAudio() {
  unlocked = true
  armResume()
  try {
    const ac = graph()
    void ac.resume()
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    gain.gain.value = 0.14
    osc.frequency.value = 880
    osc.connect(gain)
    gain.connect(ac.destination)
    osc.start()
    osc.stop(ac.currentTime + 0.18)

    if (!bed) {
      bed = ac.createOscillator()
      const kg = ac.createGain()
      kg.gain.value = 0.00008
      bed.frequency.value = 40
      bed.connect(kg)
      kg.connect(ac.destination)
      bed.start()
    }
  } catch { /* no Web Audio */ }

  const a = kioskAudio()
  a.loop = false
  a.muted = false
  a.volume = 1
  a.src = UNLOCK
  void a.play()
    .catch(() => {})
    .finally(() => {
      window.setTimeout(holdSilence, 220)
    })

  const v = kioskVideo()
  v.muted = true
  void v.play().catch(() => {})

  ;['001', '002', '003', '004', '005'].forEach((id) => {
    void loadBuffer(reelAudioFile(id)).catch(() => {})
  })

  window.dispatchEvent(new Event('ag-media-unlock'))
}

export function playKioskReel(videoSrc: string, audioSrc: string) {
  const v = kioskVideo()
  v.muted = true
  v.loop = false
  v.style.cssText = ''
  if (v.currentSrc !== new URL(videoSrc, location.href).href) v.src = videoSrc
  void v.play().catch(() => {})

  holdSilence()
  void graph().resume()
  return loadBuffer(audioSrc)
    .then((buf) => {
      startClip(buf, 0)
    })
    .catch(() => {
      const a = kioskAudio()
      a.loop = false
      a.muted = false
      a.volume = 1
      const abs = new URL(audioSrc, location.href).href
      if (a.src !== abs) a.src = audioSrc
      try { a.currentTime = 0 } catch { /* ignore */ }
      return a.play().catch(() => a.play())
    })
}

export function syncKioskAudio(seconds: number) {
  if (clipNode && clipBuf && ctx) {
    const now = ctx.currentTime - clipOffset
    if (Math.abs(now - seconds) > 0.4) startClip(clipBuf, seconds)
    return
  }
  if (!audio || audio.paused) return
  if (Math.abs(audio.currentTime - seconds) > 0.35) {
    try { audio.currentTime = seconds } catch { /* ignore */ }
  }
}

export function pauseKioskReel() {
  video?.pause()
  stopClip()
  if (unlocked) holdSilence()
}

export function stopKioskReel() {
  pauseKioskReel()
}

export const isAudioUnlocked = () => unlocked
export const getAudioContext = () => ctx
