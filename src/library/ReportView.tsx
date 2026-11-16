import { useEffect, useState } from 'react'
import { buildDossier, dataLedger, type PortraitReport } from '../shared/report.ts'
import { getBackend } from '../lib/backend.ts'
import type { VisitorProfile } from '../shared/profile.ts'
import type { ArticleResult } from '../shared/types.ts'

export default function ReportView({
  profile, article,
}: {
  profile: VisitorProfile
  article?: ArticleResult | null
}) {
  const { blocks, fallback } = buildDossier(profile, article)
  const ledger = dataLedger(profile)
  // Start with the deterministic dashboard (instant), then swap in the model's
  // synthesis when it returns. Falls back silently if synthesis is unavailable.
  const [report, setReport] = useState<PortraitReport>(fallback)
  const [synth, setSynth] = useState(true)

  useEffect(() => {
    let live = true
    void getBackend().then((b) => b.portrait(profile)).then((p) => {
      if (!live) return
      if (p && p.brands?.length) setReport(p)
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

        <div className="report-assumptions">
          <h2 className="report-assumptions-title">THE ORGANIZATION’S ASSESSMENT OF YOU{synth ? ' …' : ''}</h2>
          <div className="report-segment">SEGMENT: {report.segment}</div>

          <section className="dash-kpis">
            <div className="dash-kpis-head"><span>METRIC</span><span>VALUE</span></div>
            {report.kpis.map((k) => (
              <div key={k.label} className="dash-kpi-row">
                <span className="dash-kpi-label">{k.label}</span>
                <span className="dash-kpi-value">{k.value}</span>
              </div>
            ))}
          </section>

          <div className="dash-pitch">
            <span className="dash-pitch-tag">PITCH THAT CLOSES YOU</span>
            <span className="dash-pitch-text">“{report.pitch}”</span>
          </div>

          <section className="dash-brands">
            <h3>YOUR BRAND AFFINITY</h3>
            {report.brands.map((b) => (
              <div key={b.name} className="dash-brand">
                <div className="dash-brand-head">
                  <span className="dash-brand-name">{b.name}</span>
                  <span className="dash-brand-pct">{b.pct}%</span>
                </div>
                <div className="dash-brand-bar"><i style={{ width: `${b.pct}%` }} /></div>
                <p className="dash-brand-why">{b.why}</p>
              </div>
            ))}
          </section>

          <section className="dash-ledger">
            <h3>WHAT YOU WERE WORTH</h3>
            {ledger.lines.map((l, i) => (
              <div key={l.label} className={`dash-ledger-row${i === ledger.lines.length - 1 ? ' dash-ledger-total' : ''}`}>
                <span>{l.label}</span>
                <span>{l.value}</span>
              </div>
            ))}
            <p className="dash-ledger-note">It cost {ledger.lines[1].value} to understand you. Your data resells for {ledger.lines[0].value}. You paid the difference in yourself.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
