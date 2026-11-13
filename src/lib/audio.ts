// iPad Safari will not start a new audible <video> after TAP TO BEGIN.
// Keep one HTMLAudioElement alive from that tap, then swap its src to the reel.
// Web Audio is a backup only while the context is still running (silent-switch).
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
let usingElement = false
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

function setPlaybackSession() {
  try {
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession
    if (session) session.type = 'playback'
  } catch { /* older Safari */ }
}

function armResume() {
  if (armed) return
  armed = true
  const kick = () => {
    setPlaybackSession()
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
    audio.setAttribute('playsinline', 'true')
    audio.setAttribute('webkit-playsinline', 'true')
    audio.addEventListener('playing', () => { void graph().resume() })
    audio.addEventListener('timeupdate', () => {
      if (ctx && ctx.state !== 'running') void ctx.resume()
    })
  }
  return audio
}

export function reelAudioFile(id: string) {
  return `${BASE}content/reel-audio/${id}.m4a?v=3`
}

export function preloadReelAudio(id: string) {
  if (!id) return
  const src = reelAudioFile(id)
  void loadBuffer(src).catch(() => {})
  const hint = new Audio()
  hint.preload = 'auto'
  hint.src = src
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
  usingElement = false
}

function absUrl(src: string) {
  return new URL(src, location.href).href
}

function playThroughKiosk(src: string) {
  const a = kioskAudio()
  a.loop = false
  a.muted = false
  a.volume = 1
  if (a.src !== absUrl(src)) {
    a.src = src
    a.load()
  }
  try { a.currentTime = 0 } catch { /* ignore */ }
  usingElement = true
  return a.play()
}

function holdSilence() {
  usingElement = false
  const a = kioskAudio()
  a.loop = true
  a.muted = false
  a.volume = 1
  if (a.src !== absUrl(SILENCE)) {
    a.src = SILENCE
    a.load()
  }
  void a.play().catch(() => {})
}

export function unlockAudio() {
  unlocked = true
  setPlaybackSession()
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
    preloadReelAudio(id)
  })

  window.dispatchEvent(new Event('ag-media-unlock'))
}

export function playKioskReel(videoSrc: string, audioSrc: string) {
  const v = kioskVideo()
  v.muted = true
  v.loop = false
  v.style.cssText = ''
  if (v.currentSrc !== absUrl(videoSrc)) v.src = videoSrc
  void v.play().catch(() => {})

  stopClip()
  setPlaybackSession()
  void graph().resume()

  return playThroughKiosk(audioSrc)
    .catch(() => playThroughKiosk(videoSrc))
    .catch(() => {
      usingElement = false
      return loadBuffer(audioSrc).then((buf) => {
        startClip(buf, 0)
      })
    })
}

export function syncKioskAudio(seconds: number) {
  if (usingElement && audio && !audio.paused) {
    if (Math.abs(audio.currentTime - seconds) > 0.35) {
      try { audio.currentTime = seconds } catch { /* ignore */ }
    }
    return
  }
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

// --- STATION: play the generated clip through the SAME unlocked element, so it
// starts with no tap on the iPad (iOS autoplay is satisfied by TAP TO BEGIN). ---
let stationEnded: (() => void) | null = null

export function playStation(src: string, loops = 4) {
  const a = kioskAudio()
  setPlaybackSession()
  void graph().resume()
  stopClip()
  if (stationEnded) { a.removeEventListener('ended', stationEnded); stationEnded = null }
  let count = 0
  const handler = () => {
    count += 1
    if (count < loops) {
      try { a.currentTime = 0 } catch { /* ignore */ }
      void a.play().catch(() => {})
    } else {
      a.removeEventListener('ended', handler)
      stationEnded = null
      if (unlocked) holdSilence()
    }
  }
  stationEnded = handler
  a.loop = false
  a.muted = false
  a.volume = 1
  a.addEventListener('ended', handler)
  if (a.src !== absUrl(src)) { a.src = src; a.load() }
  try { a.currentTime = 0 } catch { /* ignore */ }
  usingElement = true
  return a.play()
}

export function pauseStation() {
  try { kioskAudio().pause() } catch { /* ignore */ }
}

export function resumeStation() {
  const a = kioskAudio()
  void graph().resume()
  usingElement = true
  void a.play().catch(() => {})
}

export function stopStation() {
  const a = kioskAudio()
  if (stationEnded) { a.removeEventListener('ended', stationEnded); stationEnded = null }
  try { a.pause() } catch { /* ignore */ }
  usingElement = false
  if (unlocked) holdSilence()
}

export function pauseKioskReel() {
  video?.pause()
  stopClip()
  usingElement = false
  if (unlocked) holdSilence()
}

export function stopKioskReel() {
  pauseKioskReel()
}

export const isAudioUnlocked = () => unlocked
export const getAudioContext = () => ctx
