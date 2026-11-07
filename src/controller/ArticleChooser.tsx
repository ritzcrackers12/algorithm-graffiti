import { useEffect, useState } from 'react'
import { loadArticleIndex, type ArticleInfo } from '../lib/content.ts'
import { haptic } from '../lib/haptics.ts'

const BASE = import.meta.env.BASE_URL

function Thumb({ id, title }: { id: string; title: string }) {
  return (
    <img
      src={`${BASE}content/articles/photos/${id}.jpg`}
      alt={title}
      onError={(e) => {
        const img = e.currentTarget
        if (img.dataset.fallback) return
        img.dataset.fallback = '1'
        img.src = `${BASE}content/articles/photos/${id}.svg`
      }}
    />
  )
}

export default function ArticleChooser({
  onPick, onBack,
}: { onPick: (id: string) => void; onBack: () => void }) {
  const [articles, setArticles] = useState<ArticleInfo[]>([])
  useEffect(() => {
    loadArticleIndex().then(setArticles).catch(console.error)
  }, [])

  return (
    <div className="picker story-pick">
      <div className="picker-label ctl-display">SELECT AN ORIGINAL.</div>
      <div className="story-list ctl-allow-scroll">
        {articles.map((a) => (
          <button
            key={a.id}
            className="story-card"
            onClick={() => {
              haptic('press')
              onPick(a.id)
            }}
          >
            <div className="thumb"><Thumb id={a.id} title={a.title} /></div>
            <div className="story-copy">
              <div className="kicker">BALL STREET JOURNAL</div>
              <div className="name">{a.title}</div>
            </div>
          </button>
        ))}
      </div>
      <button className="end-session" onClick={onBack}>BACK TO ICONS</button>
    </div>
  )
}
