import { useEffect, useState } from 'react'

export default function Credits() {
  const [names, setNames] = useState<string[]>([])
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}content/reels.json`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: { creator?: string }[]) => {
        const set = new Set<string>()
        for (const r of rows) {
          const c = (r.creator || '').trim()
          if (c) set.add(c)
        }
        setNames([...set].sort((a, b) => a.localeCompare(b)))
      })
      .catch(() => setNames([]))
  }, [])
  return (
    <div className="min-h-full bg-[#0b0b10] p-8 text-white" style={{ fontFamily: 'Supreme, system-ui, sans-serif' }}>
      <div className="mb-1 text-xs tracking-[0.3em] text-white/50">WALL LABEL</div>
      <h1 className="mb-6 text-2xl font-extrabold tracking-[0.2em]">CREDITS</h1>
      {names.length ? names.map((n) => <div key={n} className="py-1">{n}</div>) : <div className="text-white/50">NO CREATOR NAMES IN LIBRARY.</div>}
    </div>
  )
}
