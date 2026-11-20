import { useEffect, useRef, useState } from 'react'
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
  const [reportNow, setReport] = useState<PortraitReport>(fallback)
  const [saving, setSaving] = useState(false)

  // The dashboard is no longer shown on-screen (it only goes into the PDF), but
  // we still fetch the synthesized portrait so the downloaded PDF is the rich one.
  const portraitReq = useRef<Promise<PortraitReport | null> | null>(null)
  useEffect(() => {
    let live = true
    const req = getBackend().then((b) => b.portrait(profile)).then((p) => (p && p.brands?.length ? p : null)).catch(() => null)
    portraitReq.current = req
    void req.then((p) => { if (live && p) setReport(p) })
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
      // If Claude is still writing the report, wait for it (up to 45s) so the
      // visitor gets the real one, not the generic fallback.
      const fresh = await Promise.race([
        portraitReq.current ?? Promise.resolve(null),
        new Promise<null>((r) => setTimeout(() => r(null), 45_000)),
      ])
      const report = fresh ?? reportNow
      const kpis = report.kpis.length >= 5 ? report.kpis : fallback.kpis
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
    <div className="rpt-scam-screen">
      <div className="rpt-scam-head">Your report<br />is ready.</div>
      <div className="rpt-scam-wrap">
        <div className="rpt-scam-badge">★ 100% free · act now ★</div>
        <button
          className="rpt-scam-btn"
          type="button"
          disabled={saving}
          onClick={() => void makePdf(true)}
        >
          <span className="rpt-scam-shine" aria-hidden />
          {saving ? 'Preparing…' : '⬇ Download Your Report'}
          {!saving && <div className="rpt-scam-sub">tap here » no credit card required</div>}
        </button>
      </div>
    </div>
  )
}
