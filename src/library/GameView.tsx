import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { pickAd, personalizeAd } from '../shared/ads.ts'
import type { AdPlacement } from '../shared/ads.ts'
import { auctionAdItems, gameProfileFromVisitor, GAMES, traitLine } from '../shared/games.ts'
import { hydrateProfile } from '../shared/profile.ts'
import { loadGameModule, preloadP5, type GameHandle } from '../lib/gameHost.ts'
import { pushGame } from '../lib/gamePush.ts'
import { getGameWire, subscribeGameWire } from '../lib/gameSync.ts'
import type { Live } from '../lib/live.ts'
import { stageViewportBox, type Box } from './stageLayout.ts'

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
  const markRef = useRef<HTMLDivElement>(null)
  const holeRef = useRef<HTMLDivElement>(null)
  const handleRef = useRef<GameHandle | null>(null)
  const inputSeq = useRef(0)
  const inputFn = useRef<((actionId: string) => void) | null>(null)
  const pendingInput = useRef<{ seq: number; id: string } | null>(null)
  const adWait = useRef<{ seq: number; resolve: (v: { watched: boolean }) => void } | null>(null)
  const wire = useSyncExternalStore(subscribeGameWire, getGameWire)
  const [ad, setAd] = useState<AdPlacement | null>(null)
  const [line, setLine] = useState('')
  const [fail, setFail] = useState('')
  const [box, setBox] = useState<Box | null>(null)
  const [layer, setLayer] = useState<HTMLElement | null>(null)
  const profile = hydrateProfile(live.snap?.profile)
  const gameId = wire.gameId
  const row = GAMES.find((g) => g.id === gameId)
  const playing = !!gameId && !!row?.ready && !wire.ended && !fail
  const readyBox = !!box && box.width > 40 && box.height > 40

  useLayoutEffect(() => {
    setLayer(document.getElementById('ag-game-layer'))
  }, [])

  useEffect(() => {
    void preloadP5()
  }, [])

  useLayoutEffect(() => {
    const el = markRef.current
    if (!el || !playing) {
      setBox(null)
      return
    }
    const sync = () => {
      const next = stageViewportBox(el)
      if (!next) return
      setBox((prev) => {
        if (
          prev
          && Math.abs(prev.left - next.left) < 0.5
          && Math.abs(prev.top - next.top) < 0.5
          && Math.abs(prev.width - next.width) < 0.5
          && Math.abs(prev.height - next.height) < 0.5
        ) return prev
        return next
      })
    }
    sync()
    const ro = new ResizeObserver(sync)
    ro.observe(el)
    window.addEventListener('resize', sync)
    window.addEventListener('orientationchange', sync)
    const tick = window.setInterval(sync, 250)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', sync)
      window.removeEventListener('orientationchange', sync)
      window.clearInterval(tick)
    }
  }, [playing])

  useEffect(() => {
    if (!playing || !box) return
    window.dispatchEvent(new Event('resize'))
  }, [playing, box?.width, box?.height])

  useEffect(() => {
    if (!gameId || !row?.ready || !playing) {
      handleRef.current?.destroy()
      handleRef.current = null
      inputFn.current = null
      pendingInput.current = null
      return
    }
    if (!readyBox || !layer) return
    let gone = false
    inputSeq.current = 0
    inputFn.current = null
    setFail('')
    setLine('')
    setAd(null)
    const take = (seq: number, actionId: string) => {
      if (seq <= inputSeq.current || !actionId) return
      if (!inputFn.current) {
        pendingInput.current = { seq, id: actionId }
        return
      }
      inputSeq.current = seq
      inputFn.current(actionId)
    }
    void (async () => {
      for (let i = 0; i < 180; i++) {
        if (gone) return
        const hole = holeRef.current
        if (hole && hole.clientWidth > 40 && hole.clientHeight > 40) break
        await new Promise<void>((r) => window.requestAnimationFrame(() => r()))
      }
      const hole = holeRef.current
      if (gone || !hole) {
        if (!gone) setFail('GAME SURFACE FAILED.')
        return
      }
      await waitSize(hole)
      if (gone || !holeRef.current) return
      if (holeRef.current.clientWidth <= 40 || holeRef.current.clientHeight <= 40) {
        setFail('GAME SURFACE FAILED.')
        return
      }
      try {
        const mod = await loadGameModule(gameId)
        if (gone || !holeRef.current) return
        const extra = gameId === 'auction' ? auctionAdItems() : undefined
        const cfg = mod.configFromProfile(gameProfileFromVisitor(profile, live.snap?.altered.reel), extra)
        const handle = mod.create(holeRef.current, cfg, {
          onInput(fn) {
            inputFn.current = fn
            const pending = pendingInput.current
            pendingInput.current = null
            if (pending) take(pending.seq, pending.id)
            else {
              const w = getGameWire()
              if (w.actionId) take(w.inputSeq, w.actionId)
            }
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
            const reason = typeof summary.endReason === 'string' ? summary.endReason : ''
            if (reason === 'destroyed') return
            const traits = (summary.traits && typeof summary.traits === 'object')
              ? summary.traits as Record<string, string>
              : {}
            setLine(traitLine(traits))
            handleRef.current?.destroy()
            handleRef.current = null
            pushGame({ ended: true, summary, eventSeq: getGameWire().eventSeq + 1, eventType: 'game_end', eventData: summary })
          },
        })
        if (gone) {
          handle.destroy()
          return
        }
        handleRef.current = handle
      } catch (err) {
        console.warn(err)
        const msg = err instanceof Error && /p5/.test(err.message) ? 'GAME ENGINE MISSING.' : 'GAME FILE MISSING.'
        setFail(msg)
        setLine(msg)
      }
    })()
    const unsub = subscribeGameWire(() => {
      const w = getGameWire()
      if (!w.actionId) return
      take(w.inputSeq, w.actionId)
    })
    return () => {
      gone = true
      unsub()
      inputFn.current = null
      handleRef.current?.destroy()
      handleRef.current = null
    }
  }, [gameId, playing, readyBox, layer])

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

  const surface = playing && layer && readyBox && box
    ? createPortal(
      <div
        className="game-float"
        style={{ left: box.left, top: box.top, width: box.width, height: box.height }}
      >
        <div className="game-hole" ref={holeRef} />
        {ad && (
          <div className="game-ad">
            <img src={`${BASE}assets/${ad.image}`} alt="" />
            <div className="ad-kicker">Sponsored</div>
            <div className="ad-headline">{ad.headline}</div>
            <div className="ad-brand">{ad.brand}</div>
          </div>
        )}
      </div>,
      layer,
    )
    : null

  return (
    <>
      <div className="xp-toolbar">
        <span className="xp-field" style={{ flex: 1, fontSize: 13 }}>{row ? row.file : 'game.exe'}</span>
      </div>
      <div className="game-stage" ref={markRef}>
        <div className="game-mark" aria-hidden />
        {surface}
        {!gameId ? (
          <div className="game-msg">SELECT A GAME ON THE PHONE.</div>
        ) : !row?.ready ? (
          <div className="game-msg">LOCKED.</div>
        ) : wire.ended ? (
          <div className="game-msg">{line || 'SESSION RECORDED.'}</div>
        ) : fail ? (
          <div className="game-msg">{fail}</div>
        ) : null}
      </div>
      <div className="xp-statusbar">
        <span style={{ flex: 1 }}>{wire.ended ? (line || 'SESSION RECORDED.') : row ? row.title : 'STANDBY.'}</span>
        <span style={{ width: 160 }}>{wire.recommended && wire.recommended === gameId ? 'RECOMMENDED' : ''}</span>
      </div>
    </>
  )
}
