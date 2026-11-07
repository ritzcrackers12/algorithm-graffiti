import type { ObjectId } from './config.ts'
import type { VisitorProfile } from './profile.ts'
import type { AdPlacement } from './ads.ts'

export type View = 'original' | 'altered'
export type Source = 'ai' | 'mock' | 'fallback' | 'cap'

export interface Busy {
  id: number
  object: ObjectId
  startedAt: number
  etaSeconds: number
}

export interface DisplayState {
  open: ObjectId | null
  view: View
  busy: Busy | null
  openedAt: number
  /** Objects this visitor has already finished. */
  completed: ObjectId[]
  /** Objects opened this turn (unlocks Game after 2). */
  used: ObjectId[]
  /** Which original story is open. Set before article controls appear. */
  articleId: string | null
}

export interface ArticleParams {
  articleId: string
  /** -2 far left … 2 far right */
  lean: number
  /** 0 no diploma … 5 master's/PhD. Default 3 = college graduate. */
  education: number
  /** -1 negative, 0 neutral, 1 positive */
  connotation: number
  /** 0 none … 4 maximum */
  sensationalism: number
  /** 0 under $30k … 5 $500k+. null until the visitor touches the slider. */
  income: number | null
  /** Free text: state, DC, or country. Empty = no location effect. */
  location: string
}

export interface ArticleResult {
  params: ArticleParams
  title: string
  body: string
  source: Source
  at: number
  sponsored?: AdPlacement
}

export interface Altered {
  article?: ArticleResult
}

export interface Snapshot {
  hasActive: boolean
  turnStartedAt: number | null
  lastActivityAt: number | null
  display: DisplayState
  altered: Altered
  profile: VisitorProfile
  mockMode: boolean
  version: number
  serverNow: number
  waiting: number
  /** 0 = you are in control, n = place in line, -1 = not in the queue */
  position: number
  ok?: boolean
}

export type GenerateRequest =
  | { session: string; object: 'article'; params: ArticleParams; profile?: VisitorProfile }

export interface GenerateResponse {
  ok: boolean
  reason?: 'not_active' | 'busy' | 'cooldown' | 'invalid' | 'blocked' | 'error'
  secondsLeft?: number
}

export type ReplicateMode = 'proxy' | 'direct'
export type ProxyStatus = 'ok' | 'expired' | 'limit' | 'unknown'

export interface AdminStatus {
  mockMode: boolean
  hasActive: boolean
  turnStartedAt: number | null
  waiting: number
  busy: Busy | null
  open: ObjectId | null
  alteredObjects: string[]
  today: { ai: number; mock: number; fallback: number; total: number }
  serverNow: number
  replicateMode: ReplicateMode
  proxyStatus: ProxyStatus
  proxyTokenLast4: string | null
  proxyTokenUpdatedAt: number | null
  proxyToday: number
  proxyQuota: number
}

export type AdminAction =
  | 'status' | 'reset' | 'skip' | 'clear_queue' | 'mock_on' | 'mock_off'
  | 'replicate_proxy' | 'replicate_direct' | 'set_proxy_token' | 'test_ai'

export interface AdminExtra {
  token?: string
  all?: boolean
}

export interface AiTestRow {
  job: string
  ok: boolean
  skipped?: boolean
  ms: number
  source: string
  preview: string
  error?: string
}
