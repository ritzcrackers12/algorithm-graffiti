import { useEffect, useState } from 'react'
import { buildDossier } from '../shared/report.ts'
import { getBackend } from '../lib/backend.ts'
import type { VisitorProfile } from '../shared/profile.ts'
import type { ArticleResult } from '../shared/types.ts'

export default function ReportView({
  profile, article,
}: {
  profile: VisitorProfile
  article?: ArticleResult | null
}) {
  const { blocks, assumptions } = buildDossier(profile, article)
  // Start with the deterministic portrait (instant), then swap in the model's
  // synthesis when it returns. Falls back silently if synthesis is unavailable.
  const [portrait, setPortrait] = useState<{ k: string; v: string }[]>(assumptions)
  const [synth, setSynth] = useState(true)

  useEffect(() => {
    let live = true
    void getBackend().then((b) => b.portrait(profile)).then((p) => {
      if (!live) return
      if (p && p.length) setPortrait(p)
      setSynth(false)
    }).catch(() => live && setSynth(false))
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="report-stage">
      <div className="report-thanks">Thank you for your inputs.</div>
      <div className="report-scroll">
        <h1>REPORT</h1>
        {blocks.map((b) => (
          <section key={b.title}>
            <h2>{b.title}</h2>
            {b.lines.map((l) => (
              <div key={l.k} className="report-row">
                <b>{l.k}</b>
                <span>{l.v}</span>
              </div>
            ))}
          </section>
        ))}
        <section>
          <h2>WHAT WE THINK WE KNOW ABOUT YOU{synth ? ' …' : ''}</h2>
          {portrait.map((l) => (
            <div key={l.k} className="report-row">
              <b>{l.k}</b>
              <span>{l.v}</span>
            </div>
          ))}
        </section>
      </div>
    </div>
  )
}
