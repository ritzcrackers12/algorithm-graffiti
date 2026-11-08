import { useEffect, useState } from 'react'
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
const WINDOW_RECT = { left: 430, top: 22, width: 912, height: 924 }

export default function Desktop({ live }: { live: Live }) {
  const snap = live.snap
  const open = snap?.display.open ?? null
  const openedAt = snap?.display.openedAt ?? 0
  const view = snap?.display.view ?? 'original'
  const [clicking, setClicking] = useState<ObjectId | null>(null)
  const [shown, setShown] = useState<ObjectId | null>(null)
  const [closing, setClosing] = useState(false)

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
        <div className="wallpaper" style={{ backgroundImage: `url("${asset('wallpaper.jpg')}")` }} />
        <ReportView profile={profile} article={snap?.altered.article} />
        <Taskbar live={live} openId={null} />
      </div>
    )
  }

  return (
    <div className="desktop desktop-fallback">
      <div className="wallpaper" style={{ backgroundImage: `url("${asset('wallpaper.jpg')}")` }} />

      <div className="icon-grid">
        {OBJECTS.map((o) => {
          const altered = !!snap?.altered[o.id as keyof typeof snap.altered]
          const done = completed.includes(o.id)
          const locked = objectLocked(o.id, used) || !o.ready
          const cls = [
            'desk-icon',
            clicking === o.id && 'clicking',
            shown === o.id && 'is-open',
            altered && 'altered',
            done && 'done',
            locked && 'locked',
          ].filter(Boolean).join(' ')
          return (
            <div key={o.id} className={cls}>
              {done && <span className="altered-badge done-badge">DONE</span>}
              {altered && !done && <span className="altered-badge">ALTERED</span>}
              {locked && <span className="altered-badge">LOCKED</span>}
              <div className="art">
                <AssetImg
                  names={altered ? [`icon-${o.id}-altered.png`, `icon-${o.id}.png`] : [`icon-${o.id}.png`]}
                  fallback={<ObjectIcon id={o.id} />}
                />
              </div>
              <div className="label">
                {o.label}
                <span className="file">{o.file}</span>
              </div>
            </div>
          )
        })}
      </div>

      {!open && (
        <div className="click-hint">CLICK AN ICON TO START.</div>
      )}

      <QrNote />

      {obj && (
        <XpWindow
          key={`${obj.id}-${openedAt}`}
          className={`${closing ? 'closing' : obj.id === 'reel' || obj.id === 'chat' || obj.id === 'ad' ? '' : 'opening'}`}
          style={WINDOW_RECT}
          title={`${obj.file} - ${view === 'altered' ? 'ALTERED' : 'ORIGINAL'}`}
          icon={<ObjectIcon id={obj.id} />}
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
