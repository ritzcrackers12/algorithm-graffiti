import { useEffect, useState } from 'react'
import { PixelButton } from '../components/PixelButton.tsx'
import { getBackend } from '../lib/backend.ts'
import { haptic } from '../lib/haptics.ts'
import { buildDossier, dataLedger, type PortraitReport } from '../shared/report.ts'
import type { VisitorProfile } from '../shared/profile.ts'
import type { ArticleResult } from '../shared/types.ts'

export default function ControllerReport({
  profile, article, onReset,
}: {
  profile: VisitorProfile
  article?: ArticleResult | null
  onReset: () => void
}) {
  const { fallback } = buildDossier(profile, article)
  const ledger = dataLedger(profile)
  const [report, setReport] = useState<PortraitReport>(fallback)
  const kpis = report.kpis.length >= 5 ? report.kpis : fallback.kpis
  const [synth, setSynth] = useState(true)
  const [saving, setSaving] = useState(false)

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

  // Build the PDF, open it in a NEW TAB (so the visitor keeps their report),
  // then end the session — freeing the iPad for the next person. When `finish`
  // is false it just downloads without ending (plain "download" affordance).
  const makePdf = async (finish: boolean) => {
    haptic('press')
    // Open the tab synchronously inside the tap so iOS/Safari doesn't block it.
    const tab = finish ? window.open('', '_blank') : null
    setSaving(true)
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ unit: 'pt', format: 'letter' })
      const pw = doc.internal.pageSize.getWidth()
      const ph = doc.internal.pageSize.getHeight()
      const M = 56
      const W = pw - M * 2
      let y = 70
      const page = () => { doc.addPage(); y = 70 }
      doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(20)
      doc.text('THE ORGANIZATION’S ASSESSMENT OF YOU', M, y); y += 20
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(130)
      doc.text(`SEGMENT: ${report.segment}`, M, y); y += 14
      doc.text('Algorithm Graffiti', M, y); y += 22
      if (report.grade) {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(20)
        doc.text(`BUYER GRADE: ${report.grade}`, M, y); y += 16
      }
      if (report.targeting) {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(50)
        const tw = doc.splitTextToSize(report.targeting, W)
        doc.text(tw, M, y); y += tw.length * 13 + 12
      }

      // KPI chart
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(20)
      doc.text('TARGETING METRICS', M, y); y += 16
      doc.setFontSize(10)
      for (const k of kpis) {
        if (y > ph - 60) page()
        doc.setFont('helvetica', 'normal'); doc.setTextColor(70)
        doc.text(k.label, M, y)
        doc.setFont('helvetica', 'bold'); doc.setTextColor(20)
        doc.text(String(k.value), pw - M, y, { align: 'right' })
        y += 15
      }
      y += 8
      if (y > ph - 60) page()
      doc.setFont('helvetica', 'italic'); doc.setFontSize(10); doc.setTextColor(90)
      for (const ln of doc.splitTextToSize(`PITCH THAT CLOSES YOU: “${report.pitch}”`, W)) { doc.text(ln, M, y); y += 14 }
      y += 14

      // Brands
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(20)
      if (y > ph - 60) page()
      doc.text('YOUR BRAND AFFINITY', M, y); y += 16
      for (const b of report.brands) {
        if (y > ph - 70) page()
        doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(20)
        doc.text(`${b.name} — ${b.pct}%`, M, y); y += 14
        doc.setFont('helvetica', 'normal'); doc.setTextColor(40)
        const wrapped = doc.splitTextToSize(b.why, W)
        doc.text(wrapped, M, y); y += wrapped.length * 13 + 10
      }

      // Ledger
      if (y > ph - 80) page()
      y += 6
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(20)
      doc.text('WHAT YOU WERE WORTH', M, y); y += 16
      for (const l of ledger.lines) {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(70)
        doc.text(l.label, M, y)
        doc.setFont('helvetica', 'bold'); doc.setTextColor(20)
        doc.text(String(l.value), pw - M, y, { align: 'right' })
        y += 15
      }
      if (finish) {
        const url = doc.output('bloburl') as unknown as string
        if (tab) tab.location.href = url
        else doc.save('algorithm-graffiti-report.pdf') // popup blocked → fall back to download
      } else {
        doc.save('algorithm-graffiti-report.pdf')
      }
    } catch (e) {
      console.error('pdf failed', e)
      if (tab) tab.close()
    } finally {
      setSaving(false)
      if (finish) setTimeout(() => onReset(), 500) // hand the iPad to the next person
    }
  }

  return (
    <div className="ctl-report ctl-allow-scroll">
      <div className="ctl-report-head">
        <div className="ctl-report-title">THE ORGANIZATION’S<br />ASSESSMENT OF YOU{synth ? ' …' : ''}</div>
        <div className="ctl-report-segment">SEGMENT: {report.segment}</div>
      </div>

      {(report.grade || report.targeting) && (
        <section className="dash-target">
          {report.grade && <div className="dash-grade">{report.grade}</div>}
          {report.targeting && <p className="dash-target-why">{report.targeting}</p>}
        </section>
      )}

      <section className="dash-kpis">
        <div className="dash-kpis-head"><span>METRIC</span><span>VALUE</span></div>
        {kpis.map((k) => (
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

      <div className="ctl-report-actions">
        <PixelButton block type="button" disabled={saving} onClick={() => void makePdf(true)}>
          {saving ? 'PREPARING…' : 'OPEN MY REPORT ↗'}
        </PixelButton>
        <div className="ctl-report-fineprint">opens your report in a new tab, then frees the display for the next visitor</div>
        <PixelButton block type="button" disabled={saving} onClick={() => { haptic('press'); onReset() }}>JUST FINISH</PixelButton>
      </div>
    </div>
  )
}
