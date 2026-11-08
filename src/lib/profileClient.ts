import { applyArticleParams, captureDevice, emptyProfile, inferProfile, noteControl, type VisitorProfile } from '../shared/profile.ts'
import type { ArticleParams } from '../shared/types.ts'
import { sendCommand } from './live.ts'

let local: VisitorProfile = emptyProfile()

export function getLocalProfile() {
  return local
}

export function setLocalProfile(p: VisitorProfile) {
  local = inferProfile(p)
  return local
}

export function bootProfile() {
  if (!local.device) {
    const urgencyGroup = local.game.urgencyGroup ?? (Math.random() < 0.5 ? 'urgent' : 'control')
    local = inferProfile({
      ...local,
      device: captureDevice(),
      game: { ...local.game, urgencyGroup },
    })
    void sendCommand('signal', JSON.stringify({
      device: local.device, inferred: local.inferred, categories: local.categories, game: local.game,
    }))
  }
  return local
}

export function recordControl(extreme: boolean) {
  local = inferProfile(noteControl(local, extreme))
  return local
}

export function recordArticle(params: ArticleParams) {
  local = applyArticleParams(local, {
    lean: params.lean,
    education: params.education,
    income: params.income,
    location: params.location,
    connotation: params.connotation,
    sensationalism: params.sensationalism,
  })
  void sendCommand('signal', JSON.stringify({
    article: local.article,
    inferred: local.inferred,
    categories: local.categories,
    events: local.events.slice(-12),
    behavior: local.behavior,
    device: local.device,
  }))
  return local
}

export function markAdShown(id: string, extra?: Partial<VisitorProfile>) {
  const adsShown = local.adsShown.includes(id) ? local.adsShown : [...local.adsShown, id]
  local = { ...local, adsShown, ...extra }
  void sendCommand('signal', JSON.stringify({
    adsShown: local.adsShown,
    popups: local.popups,
    lastPopupAt: local.lastPopupAt,
    lastAd: local.lastAd,
  }))
  return local
}

export function resetLocalProfile() {
  local = emptyProfile()
}
