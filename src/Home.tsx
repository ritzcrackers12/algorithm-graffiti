import { CONFIG } from './shared/config.ts'

const configured = !!import.meta.env.VITE_SUPABASE_URL

export default function Home() {
  const links = [
    { href: '#/library', label: 'LIBRARY', note: 'iPad display (landscape)' },
    { href: '#/controller', label: 'CONTROLLER', note: 'Visitor phone (portrait)' },
    { href: '#/admin', label: 'ADMIN', note: 'Staff only (passcode)' },
  ]
  return (
    <div className="min-h-full grid place-items-center bg-[#0a1640] p-6 font-mono text-white">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-extrabold tracking-[0.2em]">{CONFIG.TITLE}</h1>
        <p className="mt-2 mb-8 text-sm tracking-[0.3em] text-[#9fb4ff]">{CONFIG.TAGLINE}</p>
        <div className="flex flex-col gap-3">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="block rounded-xl border border-white/20 bg-white/5 px-5 py-4 hover:bg-white/10">
              <div className="text-lg font-bold tracking-[0.25em]">{l.label}</div>
              <div className="text-xs text-white/60">{l.note}</div>
            </a>
          ))}
        </div>
        <p className="mt-8 text-xs leading-relaxed text-white/50">
          {configured ? 'LINK: SUPABASE.' : 'LINK: LOCAL MODE (Supabase not configured). Open the Library and Controller in two tabs of this browser.'}
        </p>
      </div>
    </div>
  )
}
