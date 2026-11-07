import { parseArticleMarkdown } from '../shared/article.ts'
import { rowFromRecord, type ReelRow } from '../shared/reel.ts'

const BASE = import.meta.env.BASE_URL

export const asset = (name: string) => `${BASE}assets/${name}`
export const reelFile = (id: string) => `${BASE}content/reels/${id}.mp4`

export function reelUrls(id: string): string[] {
  const local = reelFile(id)
  const sb = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const remote = sb ? `${String(sb).replace(/\/$/, '')}/storage/v1/object/public/reels/${id}.mp4` : ''
  if (import.meta.env.PROD && remote) return [remote, local]
  return remote ? [local, remote] : [local]
}

let reelLibrary: Promise<ReelRow[]> | null = null
export function loadReelLibrary(): Promise<ReelRow[]> {
  if (!reelLibrary) {
    reelLibrary = fetch(`${BASE}content/reels.json`, { cache: 'no-cache' })
      .then((r) => {
        if (!r.ok) throw new Error(`reels.json: ${r.status}`)
        return r.json()
      })
      .then((rows: Record<string, unknown>[]) => rows.map((r) => rowFromRecord(r)).filter((r) => r.id))
      .catch(() => {
        reelLibrary = null
        return []
      })
  }
  return reelLibrary
}

export interface ArticleInfo {
  id: string
  title: string
}

const cache = new Map<string, Promise<string>>()
function getText(path: string): Promise<string> {
  if (!cache.has(path)) {
    const p = fetch(`${BASE}${path}`, { cache: 'no-cache' }).then((r) => {
      if (!r.ok) throw new Error(`${path}: ${r.status}`)
      return r.text()
    })
    p.catch(() => cache.delete(path))
    cache.set(path, p)
  }
  return cache.get(path)!
}

export async function loadArticleIndex(): Promise<ArticleInfo[]> {
  return JSON.parse(await getText('content/articles/index.json'))
}

export async function loadArticle(id: string) {
  return parseArticleMarkdown(await getText(`content/articles/${id}.md`))
}
