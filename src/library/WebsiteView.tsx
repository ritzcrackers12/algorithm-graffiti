import { useCallback, useEffect, useRef, useState } from 'react'
import { CSS_VARS, MOOD_LABELS, countryLabel } from '../shared/website.ts'
import type { View, WebsiteResult } from '../shared/types.ts'
import { baseSiteUrl } from '../lib/content.ts'
import ViewTabs from './ViewTabs.tsx'

export default function WebsiteView({ view, result }: { view: View; result?: WebsiteResult }) {
  const frame = useRef<HTMLIFrameElement>(null)
  const originals = useRef<Record<string, string> | null>(null)
  const [loaded, setLoaded] = useState(0)
  const [flash, setFlash] = useState(0)

  const onLoad = () => {
    const doc = frame.current?.contentDocument
    if (!doc) return
    const map: Record<string, string> = {}
    doc.querySelectorAll<HTMLElement>('[data-editable]').forEach((el) => (map[el.dataset.editable!] = el.textContent ?? ''))
    originals.current = map
    setLoaded((n) => n + 1)
  }

  const apply = useCallback(() => {
    const doc = frame.current?.contentDocument
    if (!doc || !originals.current) return
    const root = doc.documentElement
    for (const k of Object.keys(CSS_VARS)) root.style.removeProperty(k)
    for (const a of ['data-era', 'data-mood', 'data-country']) root.removeAttribute(a)
    const altered = view === 'altered' && result
    const texts = altered ? { ...originals.current, ...result.texts } : originals.current
    doc.querySelectorAll<HTMLElement>('[data-editable]').forEach((el) => {
      const t = texts[el.dataset.editable!]
      if (t !== undefined && el.textContent !== t) el.textContent = t
    })
    if (altered) {
      for (const [k, v] of Object.entries(result.vars)) root.style.setProperty(k, v)
      root.setAttribute('data-era', String(result.params.era))
      root.setAttribute('data-mood', String(result.params.mood))
      root.setAttribute('data-country', result.params.country)
    }
    setFlash((n) => n + 1)
  }, [view, result])

  useEffect(() => {
    apply()
  }, [apply, loaded])

  const altered = view === 'altered' && result
  const p = result?.params
  const address = altered && p
    ? `http://www.orbitwell.example/?era=${p.era}&model=${encodeURIComponent(countryLabel(p).toLowerCase())}&mood=${MOOD_LABELS[p.mood].toLowerCase()}`
    : 'http://www.orbitwell.example/'

  return (
    <>
      <div className="xp-toolbar">
        <span style={{ color: '#666' }}>Address</span>
        <span className="xp-field" style={{ flex: 1, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden' }}>{address}</span>
        <button className="xp-button" style={{ minWidth: 50 }} tabIndex={-1}>Go</button>
        <ViewTabs view={view} hasAltered={!!result} />
      </div>
      <div className="browser-frame">
        <iframe ref={frame} src={baseSiteUrl} title="Website" onLoad={onLoad} />
        {flash > 1 && <div key={flash} className="scan-flash" />}
      </div>
      <div className="xp-statusbar">
        <span style={{ flex: 1 }}>{altered ? 'Done. PAGE REWRITTEN BY REMOTE OPERATOR.' : 'Done.'}</span>
        <span style={{ width: 230 }}>{altered ? `SOURCE: ${result.source.toUpperCase()}` : 'UNMODIFIED'}</span>
        <span style={{ width: 120 }}>Internet</span>
      </div>
    </>
  )
}
