import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { pickAd, personalizeAd } from '../shared/ads.ts'
import type { AdPlacement } from '../shared/ads.ts'
import { auctionAdItems, gameProfileFromVisitor, GAMES, traitLine } from '../shared/games.ts'
import { hydrateProfile } from '../shared/profile.ts'
import { loadGameModule, type GameHandle } from '../lib/gameHost.ts'
import { pushGame } from '../lib/gamePush.ts'
import { getGameWire, subscribeGameWire } from '../lib/gameSync.ts'
import type { Live } from '../lib/live.ts'

const BASE = import.meta.env.BASE_URL
const AD_MS = 10000

function waitSize(el: HTMLElement) {
  return new Promise<void>((resolve) => {
    const go = (n: number) => {
      if (el.clientWidth > 40 && el.clientHeight > 40) return resolve()
      if (n > 40) return resolve()
      window.requestAnimationFrame(() => go(n + 1))
    }
    go(0)
  })
}

export default function GameView({ live }: { live: Live }) {
  const holeRef = useRef<HTMLDivElement>(null)
  const handleRef = useRef<GameHandle | null>(null)
  const inputSeq = useRef(0)
  const inputFn = useRef<((actionId: string) => void) | null>(null)
  const adWait = useRef<{ seq: number; resolve: (v: { watched: boolean }) => void } | null>(null)
  const wire = useSyncExternalStore(subscribeGameWire, getGameWire)
  const [ad, setAd] = useState<AdPlacement | null>(null)
  const [line, setLine] = useState('')
  const profile = hydrateProfile(live.snap?.profile)
  const gameId = wire.gameId
  const row = GAMES.find((g) => g.id === gameId)

  useEffect(() => {
    const hole = holeRef.current
    if (!hole || !gameId || !row?.ready) {
      handleRef.current?.destroy()
      handleRef.current = null
      return
    }
    let gone = false
    void waitSize(hole).then(() => {
      if (gone || !holeRef.current) return
      return loadGameModule(gameId)
    }).then((mod) => {
      if (gone || !mod || !holeRef.current) return
      const extra = gameId === 'auction' ? auctionAdItems() : undefined
      const cfg = mod.configFromProfile(gameProfileFromVisitor(profile, live.snap?.altered.reel), extra)
      const handle = mod.create(holeRef.current, cfg, {
        onInput(fn) {
          inputFn.current = fn
        },
        setControls(list, opts) {
          pushGame({ controls: list, locked: !!opts?.locked })
        },
        emit(type, data) {
          pushGame({ eventSeq: getGameWire().eventSeq + 1, eventType: type, eventData: data })
        },
        requestAd() {
          const seq = getGameWire().adSeq + 1
          const match = pickAd(profile)
          const place = match ? personalizeAd(match, profile) : null
          setAd(place)
          pushGame({ adSeq: seq, adStatus: 'playing', adWatched: false, adPlace: place })
          return new Promise((resolve) => {
            adWait.current = { seq, resolve }
            window.setTimeout(() => {
              if (adWait.current?.seq !== seq) return
              adWait.current = null
              setAd(null)
              pushGame({ adStatus: 'done', adWatched: true, adPlace: null })
              resolve({ watched: true })
            }, AD_MS)
          })
        },
        onEnd(summary) {
          const traits = (summary.traits && typeof summary.traits === 'object')
            ? summary.traits as Record<string, string>
            : {}
          setLine(traitLine(traits))
          handleRef.current?.destroy()
          handleRef.current = null
          pushGame({ ended: true, summary, eventSeq: getGameWire().eventSeq + 1, eventType: 'game_end', eventData: summary })
        },
      })
      handleRef.current = handle
    }).catch((err) => {
      console.warn(err)
      setLine('GAME FILE MISSING.')
    })
    const unsub = subscribeGameWire(() => {
      const w = getGameWire()
      if (w.inputSeq <= inputSeq.current || !w.actionId) return
      inputSeq.current = w.inputSeq
      inputFn.current?.(w.actionId)
    })
    return () => {
      gone = true
      unsub()
      inputFn.current = null
      handleRef.current?.destroy()
      handleRef.current = null
    }
  }, [gameId])

  useEffect(() => {
    if (wire.adStatus !== 'done' || !adWait.current) return
    if (wire.adSeq !== adWait.current.seq) return
    const watched = wire.adWatched
    adWait.current.resolve({ watched })
    adWait.current = null
    setAd(null)
  }, [wire.adStatus, wire.adSeq, wire.adWatched])

  useEffect(() => () => {
    handleRef.current?.destroy()
    handleRef.current = null
  }, [])

  return (
    <>
      <div className="xp-toolbar">
        <span className="xp-field" style={{ flex: 1, fontSize: 13 }}>{row ? row.file : 'game.exe'}</span>
      </div>
      <div className="game-stage">
        <div className="game-hole" ref={holeRef} />
        {!gameId ? (
          <div className="game-msg">SELECT A GAME ON THE PHONE.</div>
        ) : !row?.ready ? (
          <div className="game-msg">GAME FILE NOT INSTALLED.</div>
        ) : wire.ended ? (
          <div className="game-msg">{line || 'SESSION RECORDED.'}</div>
        ) : null}
        {ad && (
          <div className="game-ad">
            <img src={`${BASE}assets/${ad.image}`} alt="" />
            <div className="ad-kicker">Sponsored</div>
            <div className="ad-headline">{ad.headline}</div>
            <div className="ad-brand">{ad.brand}</div>
          </div>
        )}
      </div>
      <div className="xp-statusbar">
        <span style={{ flex: 1 }}>{wire.ended ? (line || 'SESSION RECORDED.') : row ? row.title : 'STANDBY.'}</span>
        <span style={{ width: 160 }}>{wire.recommended && wire.recommended === gameId ? 'RECOMMENDED' : ''}</span>
      </div>
    </>
  )
}
