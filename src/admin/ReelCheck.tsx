import { useEffect, useState } from 'react'

interface CheckRow {
  id: string
  file: string
  link: string
  frame: string
  bytes: number
}

export default function ReelCheck() {
  const [rows, setRows] = useState<CheckRow[] | null>(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}content/reels-check/index.json`)
      .then((r) => {
        if (!r.ok) throw new Error('missing index')
        return r.json()
      })
      .then(setRows)
      .catch(() => setErr('NO CHECK INDEX.'))
  }, [])

  return (
    <div className="min-h-full bg-[#0b0b10] p-5 text-white" style={{ fontFamily: 'Supreme, system-ui, sans-serif' }}>
      <div className="mx-auto max-w-3xl">
        <div className="mb-1 text-xs tracking-[0.3em] text-white/50">STAFF · REEL MATCH</div>
        <h1 className="mb-2 text-2xl font-extrabold tracking-[0.2em]">FIRST FIVE</h1>
        <p className="mb-6 text-sm text-white/60">
          Videos sorted by creation time, oldest first, renamed 001.mp4–005.mp4. Open each Instagram link and check it against the frame. Tell Cursor they match (or which row is wrong).
        </p>
        {err && <div className="text-[#ff2ea0]">{err}</div>}
        <div className="grid gap-6">
          {rows?.map((row) => (
            <div key={row.id} className="flex gap-4 rounded-2xl border border-white/15 bg-white/5 p-4">
              <img
                src={`${import.meta.env.BASE_URL}${row.frame}`}
                alt=""
                className="h-64 w-36 shrink-0 rounded-lg bg-black object-cover"
              />
              <div className="flex min-w-0 flex-col gap-2 text-sm">
                <div className="text-xl font-extrabold tracking-[0.2em]">{row.id}</div>
                <div className="text-white/60">{row.file} · {(row.bytes / 1_000_000).toFixed(1)} MB raw</div>
                <a
                  href={row.link}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all text-[#c6ff3d] underline"
                >
                  {row.link}
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
