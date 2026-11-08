import { useEffect, useRef, useSyncExternalStore } from 'react'
import { haptic } from '../lib/haptics.ts'
import { getLocalProfile, markAdShown, setLocalProfile } from '../lib/profileClient.ts'
import { sendCommand } from '../lib/live.ts'
import { pushGame } from '../lib/gamePush.ts'
import { getGameWire, subscribeGameWire } from '../lib/gameSync.ts'
import { pickRecommendedGame, traitLine, type GameId } from '../shared/games.ts'
import { addEvent, inferProfile } from '../shared/profile.ts'
import type { Snapshot } from '../shared/types.ts'
import AdPhoneControls from './AdPhoneControls.tsx'
import GameChooser from './GameChooser.tsx'

export default function GameControls({ snap, locked }: { snap: Snapshot; locked: boolean }) {
  const wire = useSyncExternalStore(subscribeGameWire, getGameWire)
  const lastEvent = useRef(0)
  const closed = useRef(false)
  const profile = getLocalProfile()
  const seen = profile.game.seen
  const recommended = profile.game.recommended ?? pickRecommendedGame(profile, snap.altered.reel, seen)

  useEffect(() => {
    if (profile.game.recommended) return
    const next = inferProfile({
      ...profile,
      game: { ...profile.game, recommended, urgencyGroup: profile.game.urgencyGroup },
    })
    setLocalProfile(next)
    void sendCommand('signal', JSON.stringify({
      game: next.game,
      events: addEvent(next, { source: 'game', key: 'recommended', value: recommended, at: Date.now() }).events.slice(-12),
    }))
  }, [recommended])

  useEffect(() => {
    if (wire.eventSeq <= lastEvent.current || !wire.eventType) return
    lastEvent.current = wire.eventSeq
    const p = getLocalProfile()
    const ev = addEvent(p, {
      source: 'game',
      key: wire.eventType,
      value: typeof wire.eventData === 'string' ? wire.eventData : JSON.stringify(wire.eventData ?? {}),
      at: Date.now(),
    })
    setLocalProfile(ev)
    void sendCommand('signal', JSON.stringify({ events: ev.events.slice(-16), game: ev.game }))
  }, [wire.eventSeq, wire.eventType, wire.eventData])

  useEffect(() => {
    if (wire.adStatus === 'playing' && wire.adPlace) {
      markAdShown(wire.adPlace.adId, { lastAd: wire.adPlace })
    }
  }, [wire.adStatus, wire.adPlace?.adId])

  useEffect(() => {
    if (!wire.ended || closed.current) return
    closed.current = true
    const summary = wire.summary ?? {}
    if (summary.endReason === 'destroyed') {
      closed.current = false
      return
    }
    const traits = (summary.traits && typeof summary.traits === 'object') ? summary.traits as Record<string, string> : {}
    const gameId = (wire.gameId ?? 'higherLower') as GameId
    const p = getLocalProfile()
    const nextSeen = p.game.seen.includes(gameId) ? p.game.seen : [...p.game.seen, gameId]
    const next = inferProfile({
      ...p,
      game: {
        ...p.game,
        seen: nextSeen,
        lastSummary: summary,
        traits: { ...p.game.traits, ...traits },
        lastLine: traitLine(traits),
        tookRecommended: p.game.recommended ? p.game.recommended === gameId : null,
      },
    })
    setLocalProfile(next)
    void sendCommand('signal', JSON.stringify({ game: next.game, events: next.events.slice(-16) })).then(() => {
      handleRefReset()
    })
  }, [wire.ended, wire.summary, wire.gameId])

  const handleRefReset = () => {
    window.setTimeout(() => {
      pushGame({
        gameId: null, controls: [], locked: false, actionId: null,
        ended: false, summary: null, adStatus: 'idle', adPlace: null,
      })
      closed.current = false
    }, 900)
  }

  useEffect(() => {
    closed.current = false
  }, [snap.display.openedAt])

  const finishAd = (watched: boolean, liked?: boolean) => {
    const p = getLocalProfile()
    let next = p
    if (liked !== undefined && wire.adPlace) {
      next = addEvent(p, {
        source: 'ad',
        key: 'product_like',
        value: `${wire.adPlace.adId}:${liked ? 'yes' : 'no'}`,
        at: Date.now(),
      })
      setLocalProfile(next)
      void sendCommand('signal', JSON.stringify({ events: next.events.slice(-16) }))
    }
    pushGame({ adStatus: 'done', adWatched: watched, adPlace: null })
  }

  if (wire.adStatus === 'playing' || wire.adStatus === 'request') {
    const place = wire.adPlace ?? profile.lastAd
    if (place) {
      return (
        <AdPhoneControls
          place={place}
          profile={profile}
          locked={locked}
          onClose={() => finishAd(false)}
          onLike={(liked) => finishAd(true, liked)}
        />
      )
    }
  }

  if (!wire.gameId) {
    return <GameChooser recommended={recommended} seen={seen} />
  }

  if (wire.ended) {
    return (
      <div className="ctl-center">
        <div className="ctl-display">
          SESSION RECORDED.
          <br />
          <em>{traitLine((wire.summary?.traits as Record<string, string> | undefined) ?? profile.game.traits)}</em>
        </div>
      </div>
    )
  }

  if (!wire.controls.length) {
    return (
      <div className="ctl-center">
        <div className="ctl-display">WATCH THE GAME ON THE IPAD SCREEN.</div>
      </div>
    )
  }

  return (
    <div className="ctl-center">
      <div className="reel-rates">
        {wire.controls.map((b) => (
          <button
            key={b.id}
            className={`big-btn ${b.primary ? '' : 'ghost'}`}
            type="button"
            disabled={locked || wire.locked}
            onClick={() => {
              haptic('press')
              pushGame({ inputSeq: wire.inputSeq + 1, actionId: b.id })
            }}
          >
            {b.label}
          </button>
        ))}
      </div>
    </div>
  )
}
