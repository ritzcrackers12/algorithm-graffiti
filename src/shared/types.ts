import type { ObjectId } from './config.ts'

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
  /** Objects this visitor has already finished. Locked on the desktop. */
  completed: ObjectId[]
}

export interface ArticleParams {
  articleId: string
  /** -2 far left … 2 far right */
  lean: number
  /** 0 primary … 3 doctoral */
  education: number
  /** -1 negative, 0 neutral, 1 positive */
  connotation: number
  /** 0 none … 4 maximum */
  sensationalism: number
}

export interface ArticleResult {
  params: ArticleParams
  title: string
  body: string
  source: Source
  at: number
}

export interface WebsiteParams {
  era: 1996 | 2006 | 2016 | 2026
  /** preset id from COUNTRY_MODELS, or "custom" */
  country: string
  /** free text when country === "custom" */
  countryText: string
  /** 0 despair … 4 elation */
  mood: number
}

export interface WebsiteResult {
  params: WebsiteParams
  vars: Record<string, string>
  texts: Record<string, string>
  source: Source
  at: number
}

export interface Altered {
  article?: ArticleResult
  website?: WebsiteResult
}

export interface Snapshot {
  hasActive: boolean
  turnStartedAt: number | null
  lastActivityAt: number | null
  display: DisplayState
  altered: Altered
  mockMode: boolean
  version: number
  serverNow: number
  waiting: number
  /** 0 = you are in control, n = place in line, -1 = not in the queue */
  position: number
  ok?: boolean
}

export type GenerateRequest =
  | { session: string; object: 'article'; params: ArticleParams }
  | { session: string; object: 'website'; params: WebsiteParams }

export interface GenerateResponse {
  ok: boolean
  reason?: 'not_active' | 'busy' | 'cooldown' | 'invalid' | 'blocked' | 'error'
  secondsLeft?: number
}

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
}

export type AdminAction = 'status' | 'reset' | 'skip' | 'clear_queue' | 'mock_on' | 'mock_off'
