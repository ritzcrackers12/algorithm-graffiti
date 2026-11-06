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
  const selected = articles.find((a) => a.id === articleId)

  return (
    <div className="ctl-board">
      <Section label="STORY" value={selected ? 'SELECTED' : '—'}>
        <select
          className="metal-select"
          disabled={locked || articles.length === 0}
          value={articleId}
          onChange={(e) => set({ articleId: e.target.value })}
        >
          {articles.map((a) => (
            <option key={a.id} value={a.id}>{a.title}</option>
          ))}
        </select>
      </Section>
      <Section label="POLITICAL LEAN" value={LEAN_LABELS[p.lean + 2]}>
        <DetentSlider
          steps={5}
          value={p.lean + 2}
          onChange={(v) => set({ lean: v - 2 })}
          disabled={locked}
          track="linear-gradient(90deg, #3a5a9a, #8a8680 50%, #8a3030)"
          left="LEFT"
          right="RIGHT"
        />
      </Section>
      <div className="knob-row">
        <Section stack label="READER" value={EDUCATION_LABELS[p.education]}>
          <Knob steps={['PRI', 'SEC', 'UNI', 'PHD']} value={p.education} onChange={(v) => set({ education: v })} size={68} disabled={locked} />
        </Section>
        <Section stack label="SENSATIONALISM" value={SENSATION_LABELS[p.sensationalism]}>
          <Knob
            steps={['0', '1', '2', '3', 'MAX']}
            value={p.sensationalism}
            onChange={(v) => set({ sensationalism: v })}
            size={68}
            disabled={locked}
            accent="#c45c2a"
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
    </div>
  )
}
