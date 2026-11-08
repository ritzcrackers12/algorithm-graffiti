import { useEffect, useRef, useState } from 'react'
import { SPONSORED_MARK } from '../shared/ads.ts'
import type { VisitorProfile } from '../shared/profile.ts'
import type { ArticleResult, View } from '../shared/types.ts'
import { loadArticle, loadArticleIndex } from '../lib/content.ts'
import ViewTabs from './ViewTabs.tsx'

const PHOTO_CAP: Record<string, string> = {
  'maga-coalition': 'Election night. A MAGA hat rests on a suit jacket as supporters huddle after the returns.',
  'ai-data-centers': 'A data-center campus under construction: cranes, orange fencing and workers on red earth.',
  'military-ai': 'A mine-clearing charge detonates during a demonstration of AI-equipped military vehicles.',
}
const KICKER: Record<string, string> = {
  'maga-coalition': 'OPINION',
  'ai-data-centers': 'TECH',
  'military-ai': 'DEFENSE',
}

function takeDek(body: string): { dek: string; rest: string } {
  const trimmed = body.replace(/^\s+/, '')
  const m = trimmed.match(/^>\s*(.*?)(?:\n\s*\n([\s\S]*))?$/)
  if (!m) return { dek: '', rest: body }
  return { dek: m[1].trim(), rest: (m[2] ?? '').trim() }
}

function renderBody(body: string) {
  const paras = body.split(/\n\s*\n/)
  return paras.map((p, i) => {
    const t = p.trim()
    if (t.startsWith('%%')) {
      if (!t.startsWith(SPONSORED_MARK) || t.length <= SPONSORED_MARK.length) return null
    }
    if (t.startsWith(SPONSORED_MARK)) {
      return (
        <div key={i} className="sponsored-block">
          <div className="sponsored-kicker">
            Sponsored content
          </div>
          <p>{t.slice(SPONSORED_MARK.length).replace(/\*\*/g, '')}</p>
        </div>
      )
    }
    if (/^>\s*/.test(t)) return <p key={i} className="bsj-dek">{t.replace(/^>\s*/, '')}</p>
    if (/^##\s+/.test(t)) return <h2 key={i}>{t.replace(/^##\s+/, '')}</h2>
    if (/^KEY TAKEAWAYS/i.test(t)) return <p key={i} className="bsj-takeaways">{t}</p>
    if (/^•/.test(t)) return <p key={i} className="bsj-bullet">{t}</p>
    if (/^\*[^*].*\*$/.test(t) || /^_.*_$/.test(t)) return <p key={i} className="bsj-byline">{t.slice(1, -1)}</p>
    return <p key={i}>{t.replace(/\*\*/g, '')}</p>
  })
}

function todayLine() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/New_York',
  }).toUpperCase()
}

export default function ArticleView({
  view, result, selectedId,
}: { view: View; result?: ArticleResult; selectedId?: string | null; profile?: VisitorProfile | null }) {
  const [firstId, setFirstId] = useState<string | null>(null)
  const [original, setOriginal] = useState<{ title: string; body: string } | null>(null)
  const articleId = (view === 'altered' && result?.params.articleId)
    ? result.params.articleId
    : (selectedId || result?.params.articleId || firstId)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadArticleIndex().then((idx) => setFirstId(idx[0]?.id ?? null)).catch(console.error)
  }, [])
  useEffect(() => {
    if (articleId) loadArticle(articleId).then(setOriginal).catch(console.error)
  }, [articleId])

  const altered = view === 'altered' && result
  const doc = altered ? result : original
  const title = doc?.title ?? ''
  const body = doc?.body ?? ''

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
  }, [view, result?.at])

  const { dek, rest } = takeDek(body)
  return (
    <>
      <div className="xp-toolbar">
        <span className="xp-field" style={{ flex: 1, fontSize: 13 }}>https://www.bsj.example/articles</span>
        <ViewTabs view={view} hasAltered={!!result} />
      </div>
      <div className="doc-scroll" ref={scrollRef}>
        <div className="bsj">
          <div className="bsj-top">
            <span>{todayLine()}</span>
            <span>U.S. EDITION</span>
            <span>BSJ</span>
          </div>
          <div className="bsj-mast">The Ball Street Journal</div>
          <div className="bsj-rule" />
          <nav className="bsj-nav">
            {['World', 'Business', 'U.S.', 'Politics', 'Economy', 'Tech', 'Markets', 'Opinion', 'Arts', 'Lifestyle'].map((s) => (
              <span key={s}>{s}</span>
            ))}
          </nav>
          <div className="bsj-rule thin" />
          <div className="bsj-ticker">
            <b>MARKETS</b>
            <span>DJIA 51285.73 <i className="dn">−0.46%</i></span>
            <span>S&amp;P 500 7376.86 <i className="up">+0.31%</i></span>
            <span>NASDAQ 24579.42 <i className="up">+1.09%</i></span>
            <span>U.S. 10 YR 4.867%</span>
          </div>
          <article className="bsj-article">
            <div className="bsj-kicker">{(articleId && KICKER[articleId]) || 'U.S. NEWS'}</div>
            <h1>{title}</h1>
            {dek ? <p className="bsj-dek">{dek}</p> : null}
            {articleId && (
              <figure className="bsj-photo">
                <img
                  src={`${import.meta.env.BASE_URL}content/articles/photos/${articleId}.jpg`}
                  alt=""
                  onError={(e) => {
                    const img = e.currentTarget
                    if (img.dataset.fallback) { img.style.display = 'none'; return }
                    img.dataset.fallback = '1'
                    img.src = `${import.meta.env.BASE_URL}content/articles/photos/${articleId}.svg`
                  }}
                />
                <figcaption>{PHOTO_CAP[articleId] ?? 'Lead photograph.'}</figcaption>
              </figure>
            )}
            {rest ? renderBody(rest) : null}
          </article>
        </div>
      </div>
      <div className="xp-statusbar">
        <span style={{ flex: 1 }}>{altered ? 'OUTPUT GENERATED.' : 'SOURCE DOCUMENT.'}</span>
        <span style={{ width: 200 }}>{altered ? `SOURCE: ${result.source.toUpperCase()}` : 'UNMODIFIED'}</span>
        <span style={{ width: 120 }}>{doc ? `${doc.body.split(/\s+/).length} WORDS` : ''}</span>
      </div>
    </>
  )
}
