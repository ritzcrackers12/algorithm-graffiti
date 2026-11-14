import { useEffect, useId, useRef, useState } from 'react'
import { AssetImg } from '../components/AssetImg.tsx'
import { ObjectIcon } from '../components/ObjectIcons.tsx'
import { asset } from '../lib/content.ts'
import type { Live } from '../lib/live.ts'
import { OBJECTS, type ObjectId } from '../shared/config.ts'
import { objectLocked, objectsTouched, reportReady } from '../shared/gating.ts'
import { hydrateProfile } from '../shared/profile.ts'
import ArticleView from './ArticleView.tsx'
import AdView from './AdView.tsx'
import ChatView from './ChatView.tsx'
import PlaceholderView from './PlaceholderView.tsx'
import ReelView from './ReelView.tsx'
import ReportView from './ReportView.tsx'
import ProgressDialog from './ProgressDialog.tsx'
import QrNote from './QrNote.tsx'
import Taskbar from './Taskbar.tsx'
import { XpWindow } from './XpWindow.tsx'

const CLICK_MS = 750
const HINT_TEXT = 'Scan the QR code, and select an option on your phone to begin. Locked applications will open as you use other applications.'
const TYPE_MS = 48
const HOLD_MS = 5000

function ChainLock() {
  const uid = useId().replace(/:/g, '')
  const chain = `chain-${uid}`
  const shackle = `shackle-${uid}`
  const body = `body-${uid}`
  return (
    <svg className="chain-lock" viewBox="0 0 80 80" aria-hidden>
      <defs>
        <linearGradient id={chain} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f0f0f6" />
          <stop offset="1" stopColor="#6a6a74" />
        </linearGradient>
        <linearGradient id={shackle} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ececf2" />
          <stop offset="1" stopColor="#5c5c66" />
        </linearGradient>
        <linearGradient id={body} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe27a" />
          <stop offset="0.55" stopColor="#e0a21a" />
          <stop offset="1" stopColor="#a86a0c" />
        </linearGradient>
      </defs>
      <ellipse cx="16" cy="16" rx="8" ry="11" fill="none" stroke={`url(#${chain})`} strokeWidth="4.2" />
      <ellipse cx="28" cy="24" rx="8" ry="11" fill="none" stroke={`url(#${chain})`} strokeWidth="4.2" transform="rotate(28 28 24)" />
      <ellipse cx="36" cy="34" rx="7.5" ry="10" fill="none" stroke={`url(#${chain})`} strokeWidth="4.2" transform="rotate(48 36 34)" />
      <path d="M30 50 V38 a13 13 0 0 1 26 0 V50" fill="none" stroke={`url(#${shackle})`} strokeWidth="6.5" strokeLinecap="round" />
      <rect x="26" y="48" width="34" height="26" rx="5" fill={`url(#${body})`} stroke="#6a4208" strokeWidth="2" />
      <rect x="28" y="50" width="30" height="8" rx="2" fill="#fff" fillOpacity="0.28" />
      <circle cx="43" cy="60" r="4.2" fill="#3a2808" />
      <rect x="41" y="60" width="4" height="8" rx="1" fill="#3a2808" />
    </svg>
  )
}

function TypeHint({ text }: { text: string }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (n < text.length) {
      const t = window.setTimeout(() => setN(n + 1), TYPE_MS)
      return () => window.clearTimeout(t)
    }
    const t = window.setTimeout(() => setN(0), HOLD_MS)
    return () => window.clearTimeout(t)
  }, [n, text])
  return (
    <>
      <span className="hint-ghost" aria-hidden>{text}</span>
      <span className="hint-live">
        {text.slice(0, n)}
        <span className="hint-caret">▌</span>
      </span>
    </>
  )
}
const WINDOW_RECT = { left: 430, top: 22, width: 912, height: 924 }

const STAGE_W = 1366
const STAGE_H = 1024
const TASKBAR_H = 48
const PAD = 18
const GAP = 26
const ICON_W = 228
const ICON_H = 280
const QR_W = 252
const QR_H = 300
const HINT_W = 336
const HINT_H = 110

type Rect = { x: number; y: number; w: number; h: number }

function overlaps(a: Rect, b: Rect, gap = GAP) {
  return !(a.x + a.w + gap < b.x || b.x + b.w + gap < a.x || a.y + a.h + gap < b.y || b.y + b.h + gap < a.y)
}

function place(w: number, h: number, taken: Rect[]): Rect {
  const maxX = Math.max(PAD, STAGE_W - w - PAD)
  const maxY = Math.max(PAD, STAGE_H - TASKBAR_H - h - PAD)
  for (let i = 0; i < 140; i++) {
    const r = {
      x: PAD + Math.floor(Math.random() * Math.max(1, maxX - PAD)),
      y: PAD + Math.floor(Math.random() * Math.max(1, maxY - PAD)),
      w,
      h,
    }
    if (taken.every((t) => !overlaps(r, t))) return r
  }
  return { x: PAD + (taken.length % 5) * 48, y: PAD + taken.length * 36, w, h }
}

function scatterLayout() {
  const taken: Rect[] = []
  const qr = place(QR_W, QR_H, taken)
  taken.push(qr)
  const preferRight = qr.x + QR_W + 16 + HINT_W < STAGE_W - PAD
  const hint: Rect & { side: 'left' | 'right' } = preferRight
    ? { x: qr.x + QR_W + 14, y: qr.y + Math.round(QR_H * 0.42), w: HINT_W, h: HINT_H, side: 'right' }
    : { x: qr.x - HINT_W - 14, y: qr.y + Math.round(QR_H * 0.42), w: HINT_W, h: HINT_H, side: 'left' }
  hint.x = Math.max(PAD, Math.min(hint.x, STAGE_W - HINT_W - PAD))
  hint.y = Math.max(PAD, Math.min(hint.y, STAGE_H - TASKBAR_H - HINT_H - PAD))
  taken.push(hint)
  const icons: Record<ObjectId, { x: number; y: number }> = {
    article: { x: PAD, y: PAD },
    reel: { x: PAD, y: PAD },
    ad: { x: PAD, y: PAD },
    chat: { x: PAD, y: PAD },
  }
  for (const o of OBJECTS) {
    const r = place(ICON_W, ICON_H, taken)
    taken.push(r)
    icons[o.id] = { x: r.x, y: r.y }
  }
  return { qr: { x: qr.x, y: qr.y }, hint: { x: hint.x, y: hint.y, side: hint.side }, icons }
}

const IOS_VIDEO_ATTRS = {
  'webkit-playsinline': 'true',
  playsinline: 'true',
} as Record<string, string>

function armWallpaper(el: HTMLVideoElement) {
  el.muted = true
  el.defaultMuted = true
  el.playsInline = true
  el.loop = true
  el.autoplay = true
  el.setAttribute('muted', '')
  el.setAttribute('playsinline', 'true')
  el.setAttribute('webkit-playsinline', 'true')
}

function WallpaperVideo({ src, className }: { src: string; className: string }) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const play = () => {
      armWallpaper(el)
      void el.play().catch(() => {})
    }
    const onEnded = () => {
      try { el.currentTime = 0.001 } catch { /* iOS loop fallback */ }
      play()
    }
    const onTime = () => {
      if (el.duration > 0 && !el.paused && el.currentTime >= el.duration - 0.12) {
        try { el.currentTime = 0.001 } catch { /* iOS loop fallback */ }
      }
    }
    let resumeAt = 0
    const onPause = () => {
      if (document.querySelector('.boot')) return
      const now = performance.now()
      if (now < resumeAt) return
      resumeAt = now + 250
      play()
    }
    const ipad = /iPad|iPhone|iPod/.test(navigator.userAgent)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    armWallpaper(el)
    play()
    el.addEventListener('ended', onEnded)
    el.addEventListener('pause', onPause)
    if (ipad) el.addEventListener('timeupdate', onTime)
    window.addEventListener('ag-media-unlock', play)
    return () => {
      el.removeEventListener('ended', onEnded)
      el.removeEventListener('pause', onPause)
      el.removeEventListener('timeupdate', onTime)
      window.removeEventListener('ag-media-unlock', play)
    }
  }, [src])
  return (
    <video
      ref={ref}
      className={className}
      src={src}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      controls={false}
      disablePictureInPicture
      {...IOS_VIDEO_ATTRS}
    />
  )
}

function Wallpaper() {
  return (
    <div className="wallpaper">
      <WallpaperVideo className="wallpaper-video" src={asset('wallpaper.mp4')} />
      <div className="wallpaper-dim" />
      <WallpaperVideo className="wallpaper-video wallpaper-overlay" src={asset('wallpaper-overlay.mp4')} />
      <video
        src={asset('waiting-radio.mp4')}
        muted
        playsInline
        preload="auto"
        aria-hidden
        tabIndex={-1}
        style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
      />
    </div>
  )
}

export default function Desktop({ live, begun = true }: { live: Live; begun?: boolean }) {
  const snap = live.snap
  const open = snap?.display.open ?? null
  const openedAt = snap?.display.openedAt ?? 0
  const view = snap?.display.view ?? 'original'
  const [clicking, setClicking] = useState<ObjectId | null>(null)
  const [shown, setShown] = useState<ObjectId | null>(null)
  const [closing, setClosing] = useState(false)
  const [scatter] = useState(scatterLayout)

  useEffect(() => {
    if (open) {
      setClosing(false)
      setClicking(open)
      const instant = open === 'reel' || open === 'chat' || open === 'ad'
      if (instant) setShown(open)
      else setShown(null)
      const t = setTimeout(() => {
        setShown(open)
        setClicking(null)
      }, instant ? 0 : CLICK_MS)
      return () => clearTimeout(t)
    }
    setClicking(null)
    setClosing(true)
    const t = setTimeout(() => {
      setShown(null)
      setClosing(false)
    }, 220)
    return () => clearTimeout(t)
  }, [open, openedAt])

  const obj = OBJECTS.find((o) => o.id === shown)
  const completed = snap?.display.completed ?? []
  const profile = hydrateProfile(snap?.profile)
  const used = objectsTouched(snap)
  const showReport = !open && reportReady(used)

  if (showReport) {
    return (
      <div className="desktop desktop-fallback">
        <Wallpaper />
        <ReportView profile={profile} article={snap?.altered.article} />
        <Taskbar live={live} openId={null} />
      </div>
    )
  }

  return (
    <div className="desktop desktop-fallback">
      <Wallpaper />

      <div className="icon-grid">
        {OBJECTS.map((o) => {
          const altered = !!snap?.altered[o.id as keyof typeof snap.altered]
          const done = completed.includes(o.id)
          const locked = objectLocked(o.id, used) || !o.ready
          const pos = scatter.icons[o.id]
          const cls = [
            'desk-icon',
            clicking === o.id && 'clicking',
            shown === o.id && 'is-open',
            altered && 'altered',
            done && 'done',
            locked && 'locked',
          ].filter(Boolean).join(' ')
          return (
            <div key={o.id} className={cls} style={{ left: pos.x, top: pos.y }}>
              {done && <span className="altered-badge done-badge">DONE</span>}
              {altered && !done && <span className="altered-badge">ALTERED</span>}
              <div className="art">
                <AssetImg
                  names={altered ? [`icon-${o.id}-altered.png`, `icon-${o.id}.png`] : [`icon-${o.id}.png`]}
                  fallback={<ObjectIcon id={o.id} />}
                />
                {locked && <ChainLock />}
              </div>
              <div className="label">
                {o.label}
                <span className="file">{o.file}</span>
              </div>
            </div>
          )
        })}
      </div>

      {!open && begun && (
        <div
          className={`click-hint side-${scatter.hint.side}`}
          style={{ left: scatter.hint.x, top: scatter.hint.y }}
        >
          <TypeHint text={HINT_TEXT} />
        </div>
      )}

      <QrNote style={{ left: scatter.qr.x, top: scatter.qr.y }} />

      {obj && (
        <XpWindow
          key={`${obj.id}-${openedAt}`}
          className={`${closing ? 'closing' : obj.id === 'reel' || obj.id === 'chat' || obj.id === 'ad' ? '' : 'opening'}`}
          style={WINDOW_RECT}
          title={`${obj.file} - ${view === 'altered' ? 'ALTERED' : 'ORIGINAL'}`}
          icon={<AssetImg names={[`icon-${obj.id}.png`]} fallback={<ObjectIcon id={obj.id} />} />}
        >
          {obj.id === 'article' ? (
            profile?.session?.articleCompare && snap?.altered.article ? (
              <div className="article-compare">
                <div className="article-compare-pane">
                  <ArticleView view="original" result={snap?.altered.article} selectedId={snap?.display.articleId} profile={profile} />
                </div>
                <div className="article-compare-pane">
                  <ArticleView view="altered" result={snap?.altered.article} selectedId={snap?.display.articleId} profile={profile} />
                </div>
              </div>
            ) : (
              <ArticleView
                view={view}
                result={snap?.altered.article}
                selectedId={snap?.display.articleId}
                profile={profile}
              />
            )
          ) : obj.id === 'reel' ? (
            <ReelView result={snap?.altered.reel} openedAt={openedAt} profile={profile} />
          ) : obj.id === 'ad' ? (
            <AdView result={snap?.altered.ad} profile={profile} tuning={snap?.display.busy?.object === 'ad'} />
          ) : obj.id === 'chat' ? (
            <ChatView profile={profile} />
          ) : (
            <PlaceholderView id={obj.id} />
          )}
        </XpWindow>
      )}

      {snap?.display.busy && snap.display.busy.object !== 'reel' && snap.display.busy.object !== 'chat' && snap.display.busy.object !== 'ad' && (
        <ProgressDialog busy={snap.display.busy} />
      )}
      <Taskbar live={live} openId={shown} />
    </div>
  )
}
