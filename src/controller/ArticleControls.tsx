import { useEffect, useMemo, useState } from 'react'
import {
  CONNOTATION_LABELS, DEFAULT_ARTICLE_PARAMS, EDUCATION_KNOB, EDUCATION_LABELS, INCOME_LABELS,
  LEAN_LABELS, SENSATION_LABELS,
} from '../shared/article.ts'
import { locationSuggestions, resolveLocation } from '../shared/locations.ts'
import { isBlocked } from '../shared/text.ts'
import type { ArticleParams, Snapshot } from '../shared/types.ts'
import { loadArticleIndex, type ArticleInfo } from '../lib/content.ts'
import { PixelButton } from '../components/PixelButton.tsx'
import { haptic } from '../lib/haptics.ts'
import { recordControl } from '../lib/profileClient.ts'
import { DetentSlider, Knob, Section, Segmented } from './controls.tsx'
import type { Transmit } from './Controller.tsx'
import { useControls } from './useControls.ts'

export default function ArticleControls({
  snap, articleId, locked, transmit, say,
}: { snap: Snapshot; articleId: string; locked: boolean; transmit: Transmit; say: (t: string) => void }) {
  const [articles, setArticles] = useState<ArticleInfo[]>([])
  const [panel, setPanel] = useState<'frame' | 'audience'>('frame')
  const [p, setRaw] = useControls<ArticleParams>('article', snap.turnStartedAt, () => ({
    articleId,
    ...DEFAULT_ARTICLE_PARAMS,
    ...(snap.altered.article?.params.articleId === articleId ? snap.altered.article.params : {}),
  }))
  const set = (patch: Partial<ArticleParams>) => {
    const next = { ...p, ...patch }
    const extreme =
      next.lean === -2 || next.lean === 2 ||
      next.sensationalism === 4 ||
      next.education === 0 || next.education === 5 ||
      next.income === 0 || next.income === 5
    recordControl(extreme)
    setRaw(patch)
  }
  const [locDraft, setLocDraft] = useState(p.location)
  const [locOpen, setLocOpen] = useState(false)

  useEffect(() => {
    loadArticleIndex().then(setArticles).catch(console.error)
  }, [])

  const selected = articles.find((a) => a.id === articleId)
  const loc = resolveLocation(p.location)
  const locStatus = !p.location.trim()
    ? 'UNSET'
    : loc.kind === 'none'
      ? 'NOT RECOGNIZED'
      : loc.kind === 'state'
        ? loc.profile.name.toUpperCase()
        : loc.name.toUpperCase()
  const suggestions = useMemo(() => locationSuggestions(locDraft), [locDraft])

  const commitLocation = (raw: string) => {
    const t = raw.replace(/\s+/g, ' ').trim().slice(0, 40)
    if (t && isBlocked(t)) {
      haptic('error')
      say('INPUT REJECTED. TERM NOT PERMITTED.')
      return
    }
    haptic('tick')
    set({ location: t })
    setLocDraft(t)
    setLocOpen(false)
    const r = resolveLocation(t)
    if (!t) say('LOCATION CLEARED. NO ADJUSTMENT APPLIED.')
    else if (r.kind === 'none') say('LOCATION NOT RECOGNIZED. NO ADJUSTMENT APPLIED.')
    else say(`LOCATION ACQUIRED: ${r.kind === 'state' ? r.profile.name.toUpperCase() : r.name.toUpperCase()}.`)
  }

  const send = () => transmit({ object: 'article', params: { ...p, articleId } })

  return (
    <div className="ctl-board">
      <Segmented
        options={[
          { value: 'frame', label: 'FRAME' },
          { value: 'audience', label: 'AUDIENCE' },
        ]}
        value={panel}
        disabled={locked}
        onChange={setPanel}
      />

      {panel === 'frame' ? (
        <>
          <Section label="STORY" value="LOCKED">
            <div className="story-locked">{selected?.title ?? articleId}</div>
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
          <Section label="SENSATIONALISM" value={SENSATION_LABELS[p.sensationalism]}>
            <DetentSlider
              steps={5}
              value={p.sensationalism}
              onChange={(v) => set({ sensationalism: v })}
              disabled={locked}
              track="linear-gradient(90deg, #3a3a36, #c45c2a)"
              left="NONE"
              right="MAX"
            />
          </Section>
        </>
      ) : (
        <>
          <Section stack label="READER PROFILE" value={EDUCATION_LABELS[p.education]}>
            <Knob
              steps={EDUCATION_KNOB}
              value={p.education}
              onChange={(v) => set({ education: v })}
              size={72}
              disabled={locked}
            />
          </Section>
          <Section label="INCOME BRACKET" value={p.income === null ? 'UNSET' : INCOME_LABELS[p.income]}>
            <DetentSlider
              steps={6}
              value={p.income ?? 0}
              unset={p.income === null}
              onChange={(v) => set({ income: v })}
              disabled={locked}
              track="linear-gradient(90deg, #4a5a3a, #c9a227)"
              left="UNDER $30K"
              right="$500K+"
            />
          </Section>
          <Section label="WHERE ARE YOU READING FROM?" value={locStatus}>
            <div className="loc-field">
              <span className="loc-icon" aria-hidden>{loc.kind === 'country' ? '🌐' : '📍'}</span>
              <input
                className="metal-input"
                disabled={locked}
                value={locDraft}
                maxLength={40}
                placeholder="STATE OR COUNTRY"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                onChange={(e) => {
                  setLocDraft(e.target.value)
                  setLocOpen(true)
                }}
                onFocus={() => setLocOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitLocation(suggestions[0] ?? locDraft)
                }}
                onBlur={() => {
                  window.setTimeout(() => commitLocation(locDraft), 120)
                }}
              />
            </div>
            {locOpen && suggestions.length > 0 && (
              <div className="loc-suggest ctl-allow-scroll">
                {suggestions.map((s) => (
                  <PixelButton
                    key={s}
                    type="button"
                    block
                    disabled={locked}
                    onPointerDown={(e) => e.preventDefault()}
                    onClick={() => commitLocation(s)}
                  >
                    {s.toUpperCase()}
                  </PixelButton>
                ))}
              </div>
            )}
          </Section>
        </>
      )}

      <PixelButton className="rewrite-btn" block disabled={locked || !articleId} onClick={send}>
        REWRITE ARTICLE
      </PixelButton>
    </div>
  )
}
