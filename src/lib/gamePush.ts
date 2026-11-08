import { getBackend } from './backend.ts'
import { emitGameWire, getGameWire, type GameWire } from './gameSync.ts'

export function pushGame(patch: Partial<GameWire>) {
  emitGameWire(patch)
  void getBackend().then((b) => b.reportGame(getGameWire()))
}
