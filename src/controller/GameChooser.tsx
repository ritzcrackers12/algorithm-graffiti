import { useRef } from 'react'
import { PixelButton } from '../components/PixelButton.tsx'
import { haptic } from '../lib/haptics.ts'
import { pushGame } from '../lib/gamePush.ts'
import { GAMES, playableGames, type GameId } from '../shared/games.ts'

export default function GameChooser({
  recommended, seen = [],
}: { recommended: GameId | null; seen?: GameId[] }) {
  const lastTap = useRef(0)
  const left = playableGames(seen)
  const pick = (id: GameId, shut: boolean) => {
    if (shut) return
    const now = Date.now()
    if (now - lastTap.current < 250) return
    lastTap.current = now
    haptic('press')
    pushGame({
      gameId: id,
      recommended,
      ended: false,
      summary: null,
      controls: [],
      locked: false,
      inputSeq: 0,
      actionId: null,
      eventSeq: 0,
      eventType: null,
      eventData: null,
      adStatus: 'idle',
      adPlace: null,
    })
  }
  if (!left.length) {
    return (
      <div className="ctl-center">
        <div className="ctl-display">SESSION CLOSED.</div>
        <div className="ctl-label">NO GAMES REMAINING.</div>
      </div>
    )
  }
  return (
    <div className="ctl-center">
      <div className="ctl-display">SELECT A GAME.</div>
      <div className="reel-rates ctl-allow-scroll">
        {GAMES.map((g) => {
          const rec = g.id === recommended
          const played = seen.includes(g.id)
          const shut = played || !g.ready
          return (
            <PixelButton
              key={g.id}
              type="button"
              block
              selected={rec && !shut}
              disabled={shut}
              onPointerDown={(e) => {
                if (e.button !== 0) return
                e.preventDefault()
                pick(g.id, shut)
              }}
              onClick={() => pick(g.id, shut)}
            >
              {shut ? `${g.title} · LOCKED` : rec ? `${g.title} · RECOMMENDED FOR YOU` : g.title}
            </PixelButton>
          )
        })}
      </div>
    </div>
  )
}
