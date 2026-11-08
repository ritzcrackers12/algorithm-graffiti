import { PixelButton } from '../components/PixelButton.tsx'
import { haptic } from '../lib/haptics.ts'
import { pushGame } from '../lib/gamePush.ts'
import { GAMES, playableGames, type GameId } from '../shared/games.ts'

export default function GameChooser({
  recommended, seen = [],
}: { recommended: GameId | null; seen?: GameId[] }) {
  const left = playableGames(seen)
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
      <div className="reel-rates">
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
              onClick={() => {
                haptic('press')
                pushGame({
                  gameId: g.id,
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
              }}
            >
              {shut ? `${g.title} · LOCKED` : rec ? `${g.title} · RECOMMENDED FOR YOU` : g.title}
            </PixelButton>
          )
        })}
      </div>
    </div>
  )
}
