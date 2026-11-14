import { useEffect, useState } from 'react'
import { PixelButton } from '../components/PixelButton.tsx'
import { getBackend } from '../lib/backend.ts'
import { haptic } from '../lib/haptics.ts'
import { buildDossier, type ReportBlock } from '../shared/report.ts'
import type { VisitorProfile } from '../shared/profile.ts'
import type { ArticleResult } from '../shared/types.ts'

export default function ControllerReport({
  profile, article, onReset,
}: {
  profile: VisitorProfile
  article?: ArticleResult | null
  onReset: () => void
}) {
  const { assumptions } = buildDossier(profile, article)
  const [blocks, setBlocks] = useState<ReportBlock[]>(assumptions)
  const [synth, setSynth] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let live = true
    void getBackend().then((b) => b.portrait(profile)).then((p) => {
      if (!live) return
      if (p && p.length) setBlocks(p)
      setSynth(false)
    }).catch(() => live && setSynth(false))
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const download = async () => {
    haptic('press')
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
      for (const ln of doc.splitTextToSize('THE ORGANIZATION’S ASSUMPTION OF YOU', W)) { doc.text(ln, M, y); y += 22 }
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(130)
      doc.text('Algorithm Graffiti', M, y); y += 26
      for (const b of blocks) {
        if (y > ph - 90) page()
        doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(20)
        doc.text(b.title, M, y); y += 18
        for (const l of b.lines) {
          if (y > ph - 70) page()
          doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(60)
          doc.text(l.k, M, y); y += 14
          doc.setFont('helvetica', 'normal'); doc.setTextColor(30)
          const wrapped = doc.splitTextToSize(l.v, W)
          doc.text(wrapped, M, y); y += wrapped.length * 13 + 10
        }
        y += 10
      }
      doc.save('algorithm-graffiti-report.pdf')
    } catch (e) {
      console.error('pdf failed', e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="ctl-report ctl-allow-scroll">
      <div className="ctl-report-head">
        <div className="ctl-report-title">THE ORGANIZATION’S<br />ASSUMPTION OF YOU{synth ? ' …' : ''}</div>
        <div className="ctl-report-sub">Everything it decided from your visit. Yours to take.</div>
      </div>
      {blocks.map((b) => (
        <section key={b.title} className="ctl-report-lens">
          <h3>{b.title}</h3>
          {b.lines.map((l) => (
            <div key={l.k} className="ctl-report-row">
              <b>{l.k}</b>
              <span>{l.v}</span>
            </div>
          ))}
        </section>
      ))}
      <div className="ctl-report-actions">
        <PixelButton block type="button" disabled={saving} onClick={() => void download()}>
          {saving ? 'PREPARING…' : 'DOWNLOAD PDF'}
        </PixelButton>
        <PixelButton block type="button" onClick={() => { haptic('press'); onReset() }}>DONE</PixelButton>
      </div>
    </div>
  )
}
