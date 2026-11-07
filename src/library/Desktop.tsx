import { useEffect, useState } from 'react'
import { AssetImg } from '../components/AssetImg.tsx'
import { ObjectIcon } from '../components/ObjectIcons.tsx'
import { asset } from '../lib/content.ts'
import type { Live } from '../lib/live.ts'
import { OBJECTS, type ObjectId } from '../shared/config.ts'
import { hydrateProfile } from '../shared/profile.ts'
import type { AdPlacement } from '../shared/ads.ts'
import AdPopup from './AdPopup.tsx'
import ArticleView from './ArticleView.tsx'
import PlaceholderView from './PlaceholderView.tsx'
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
  const [adClosed, setAdClosed] = useState(0)

  useEffect(() => {
    if (open) {
      setClosing(false)
      setShown(null)
      setClicking(open)
      const t = setTimeout(() => {
        setShown(open)
        setClicking(null)
      }, CLICK_MS)
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
  const place = profile.lastAd && profile.lastAd.at !== adClosed ? profile.lastAd as AdPlacement : null

  return (
    <div className="desktop desktop-fallback">
      <div className="wallpaper" style={{ backgroundImage: `url("${asset('wallpaper.jpg')}")` }} />

      <div className="icon-grid">
        {OBJECTS.map((o) => {
          const altered = !!snap?.altered[o.id as keyof typeof snap.altered]
          const done = completed.includes(o.id)
          const locked = !o.ready
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
          className={`${closing ? 'closing' : 'opening'}`}
          style={WINDOW_RECT}
          title={`${obj.file} - ${view === 'altered' ? 'ALTERED' : 'ORIGINAL'}`}
          icon={<ObjectIcon id={obj.id} />}
        >
          {obj.id === 'article' ? (
            <ArticleView
              view={view}
              result={snap?.altered.article}
              selectedId={snap?.display.articleId}
              profile={profile}
            />
          ) : (
            <PlaceholderView id={obj.id} />
          )}
        </XpWindow>
      )}

      {snap?.display.busy && <ProgressDialog busy={snap.display.busy} />}
      {place && (!open || snap?.display.busy) && (
        <AdPopup place={place} profile={profile} onClose={() => setAdClosed(place.at)} />
      )}
      <Taskbar live={live} openId={shown} />
    </div>
  )
}
