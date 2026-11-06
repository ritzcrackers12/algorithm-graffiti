import { useEffect, useState } from 'react'
import { CONNOTATION_LABELS, DEFAULT_ARTICLE_PARAMS, EDUCATION_LABELS, LEAN_LABELS, SENSATION_LABELS } from '../shared/article.ts'
import type { ArticleParams, Snapshot } from '../shared/types.ts'
import { loadArticleIndex, type ArticleInfo } from '../lib/content.ts'
import { DetentSlider, Knob, Section, Segmented } from './controls.tsx'
import type { Transmit } from './Controller.tsx'
import { useControls } from './useControls.ts'

export default function ArticleControls({ snap, locked, transmit }: { snap: Snapshot; locked: boolean; transmit: Transmit }) {
  const [articles, setArticles] = useState<ArticleInfo[]>([])
  const [p, set] = useControls<ArticleParams>('article', snap.turnStartedAt, () => ({
    articleId: '',
    ...DEFAULT_ARTICLE_PARAMS,
    ...(snap.altered.article?.params ?? {}),
  }))

  useEffect(() => {
    loadArticleIndex().then(setArticles).catch(console.error)
  }, [])
  const articleId = p.articleId || articles[0]?.id || ''

  return (
    <>
      {articles.length > 1 && (
        <Segmented
          options={articles.map((a, i) => ({ value: a.id, label: `DOC ${String(i + 1).padStart(2, '0')}` }))}
          value={articleId}
          disabled={locked}
          onChange={(v) => set({ articleId: v })}
        />
      )}
      <Section label="POLITICAL LEAN" value={LEAN_LABELS[p.lean + 2]}>
        <DetentSlider
          steps={5}
          value={p.lean + 2}
          onChange={(v) => set({ lean: v - 2 })}
          disabled={locked}
          track="linear-gradient(90deg, #2b59ff, #8a8aa0 50%, #ff3b3b)"
          left="LEFT"
          right="RIGHT"
        />
      </Section>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Section label="READER" value={EDUCATION_LABELS[p.education].slice(0, 5)} style={{ padding: '14px 4px 6px' }}>
          <Knob steps={['PRI', 'SEC', 'UNI', 'PHD']} value={p.education} onChange={(v) => set({ education: v })} size={84} disabled={locked} />
        </Section>
        <Section label="HYPE" value={SENSATION_LABELS[p.sensationalism].slice(0, 4)} style={{ padding: '14px 4px 6px' }}>
          <Knob
            steps={['0', '1', '2', '3', 'MAX']}
            value={p.sensationalism}
            onChange={(v) => set({ sensationalism: v })}
            size={84}
            disabled={locked}
            accent="#ff2ea0"
          />
        </Section>
      </div>
      <Section label="CONNOTATION" value={CONNOTATION_LABELS[p.connotation + 1]}>
        <Segmented
          options={[
            { value: -1, label: 'NEG' },
            { value: 0, label: 'NEUTRAL' },
            { value: 1, label: 'POS' },
          ]}
          value={p.connotation}
          disabled={locked}
          onChange={(v) => set({ connotation: v })}
        />
      </Section>
      <button
        className="big-btn"
        disabled={locked || !articleId}
        onClick={() => transmit({ object: 'article', params: { ...p, articleId } })}
      >
        REWRITE ARTICLE
      </button>
    </>
  )
}
