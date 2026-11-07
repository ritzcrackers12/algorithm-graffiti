import { parseArticleMarkdown } from '../shared/article.ts'

const BASE = import.meta.env.BASE_URL

export const asset = (name: string) => `${BASE}assets/${name}`
export const reelFile = (id: string) => `${BASE}content/reels/${id}.mp4`

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
