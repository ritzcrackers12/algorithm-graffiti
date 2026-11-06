import { useEffect, useRef, useState, type ReactNode } from 'react'
import { CONNOTATION_LABELS, EDUCATION_LABELS, LEAN_LABELS, SENSATION_LABELS } from '../shared/article.ts'
import type { ArticleResult, View } from '../shared/types.ts'
import { loadArticle, loadArticleIndex } from '../lib/content.ts'
import ViewTabs from './ViewTabs.tsx'

const typedAlready = new Set<number>()

/** Reveals `text` character by character the first time a new result arrives ("types itself"). */
function useTypewriter(text: string, animateKey: number | null) {
  const [count, setCount] = useState(text.length)
  useEffect(() => {
    if (animateKey === null || typedAlready.has(animateKey)) {
      setCount(text.length)
      return
    }
    typedAlready.add(animateKey)
    const total = Math.min(11_000, Math.max(3_000, text.length * 9))
    const start = performance.now()
    let raf = 0
    const step = (t: number) => {
      const n = Math.floor(((t - start) / total) * text.length)
      setCount(Math.min(text.length, n))
      if (n < text.length) raf = requestAnimationFrame(step)
    }
    setCount(0)
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [text, animateKey])
  return count
}

function renderBody(body: string, caret: ReactNode) {
  const paras = body.split(/\n\s*\n/)
  return paras.map((p, i) => {
    const last = i === paras.length - 1
    const t = p.trim()
    if (/^##\s+/.test(t)) return <h2 key={i}>{t.replace(/^##\s+/, '')}{last && caret}</h2>
    if (/^\*[^*].*\*$/.test(t) || /^_.*_$/.test(t)) return <p key={i} className="byline">{t.slice(1, -1)}{last && caret}</p>
    return <p key={i}>{t.replace(/\*\*/g, '')}{last && caret}</p>
  })
}

export default function ArticleView({ view, result }: { view: View; result?: ArticleResult }) {
  const [firstId, setFirstId] = useState<string | null>(null)
  const [original, setOriginal] = useState<{ title: string; body: string } | null>(null)
  const articleId = result?.params.articleId ?? firstId
  const scrollRef = useRef<HTMLDivElement>(null)
  const caretRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    loadArticleIndex().then((idx) => setFirstId(idx[0]?.id ?? null)).catch(console.error)
  }, [])
  useEffect(() => {
    if (articleId) loadArticle(articleId).then(setOriginal).catch(console.error)
  }, [articleId])

  const altered = view === 'altered' && result
  const doc = altered ? result : original
  const full = doc ? `${doc.title}\n${doc.body}` : ''
  const count = useTypewriter(full, altered ? result.at : null)
  const typing = count < full.length
  const shown = full.slice(0, count)
  const nl = shown.indexOf('\n')
  const title = nl === -1 ? shown : shown.slice(0, nl)
  const body = nl === -1 ? '' : shown.slice(nl + 1)

  useEffect(() => {
    if (typing) caretRef.current?.scrollIntoView({ block: 'nearest' })
  }, [typing, count])
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
  }, [view, result?.at])

  const caret = typing ? <span ref={caretRef} className="caret" /> : null
  const p = result?.params

  return (
    <>
      <div className="xp-toolbar">
        <span className="xp-field" style={{ width: 170 }}>Georgia</span>
        <span className="xp-field" style={{ width: 44 }}>12</span>
        <b>B</b><i>I</i><u>U</u>
        <span style={{ marginLeft: 'auto' }} />
        <ViewTabs view={view} hasAltered={!!result} />
      </div>
      <div className="doc-scroll" ref={scrollRef}>
        <div className="doc-page">
          {altered && p && (
            <div className="doc-profile">
              PROFILE: LEAN {LEAN_LABELS[p.lean + 2]} · READER {EDUCATION_LABELS[p.education]} · CONNOTATION{' '}
              {CONNOTATION_LABELS[p.connotation + 1]} · SENSATIONALISM {SENSATION_LABELS[p.sensationalism]}
            </div>
          )}
          <h1>{title}{nl === -1 && caret}</h1>
          {nl !== -1 && renderBody(body, caret)}
        </div>
      </div>
      <div className="xp-statusbar">
        <span style={{ flex: 1 }}>{typing ? 'RECEIVING OUTPUT...' : altered ? 'OUTPUT GENERATED.' : 'SOURCE DOCUMENT.'}</span>
        <span style={{ width: 200 }}>{altered ? `SOURCE: ${result.source.toUpperCase()}` : 'UNMODIFIED'}</span>
        <span style={{ width: 120 }}>{doc ? `${doc.body.split(/\s+/).length} WORDS` : ''}</span>
      </div>
    </>
  )
}
