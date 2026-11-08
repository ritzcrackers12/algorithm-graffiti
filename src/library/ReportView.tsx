import { buildDossier } from '../shared/report.ts'
import type { VisitorProfile } from '../shared/profile.ts'
import type { ArticleResult } from '../shared/types.ts'

export default function ReportView({
  profile, article,
}: {
  profile: VisitorProfile
  article?: ArticleResult | null
}) {
  const { blocks, assumptions } = buildDossier(profile, article)
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
          <h2>ASSUMPTIONS</h2>
          {assumptions.map((a) => (
            <div key={a} className="report-row"><span>{a}</span></div>
          ))}
        </section>
      </div>
    </div>
  )
}
