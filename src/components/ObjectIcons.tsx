// Placeholder icon art (shown until public/assets/icon-*.png exist). Glossy, XP-flavoured, original.
import type { ObjectId } from '../shared/config.ts'

const Gloss = ({ id }: { id: string }) => (
  <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stopColor="#fff" stopOpacity="0.65" />
    <stop offset="0.5" stopColor="#fff" stopOpacity="0.08" />
    <stop offset="0.51" stopColor="#fff" stopOpacity="0" />
  </linearGradient>
)

function Reel() {
  return (
    <svg viewBox="0 0 128 128">
      <defs>
        <linearGradient id="reel-a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ff9a3c" /><stop offset="1" stopColor="#e5177b" /></linearGradient>
        <Gloss id="reel-g" />
      </defs>
      <rect x="34" y="8" width="60" height="112" rx="12" fill="#1b1b2b" />
      <rect x="38" y="16" width="52" height="96" rx="6" fill="url(#reel-a)" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <g key={i} fill="#1b1b2b"><rect x="27" y={18 + i * 16} width="7" height="9" rx="2" /><rect x="94" y={18 + i * 16} width="7" height="9" rx="2" /></g>
      ))}
      <circle cx="64" cy="64" r="20" fill="#fff" fillOpacity="0.92" />
      <path d="M58 53 L77 64 L58 75 Z" fill="#e5177b" />
      <rect x="38" y="16" width="52" height="48" rx="6" fill="url(#reel-g)" />
    </svg>
  )
}

function Website() {
  return (
    <svg viewBox="0 0 128 128">
      <defs>
        <linearGradient id="web-w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fdfdfd" /><stop offset="1" stopColor="#d9e3f2" /></linearGradient>
        <radialGradient id="web-g" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stopColor="#7fd3ff" /><stop offset="0.6" stopColor="#1f7be0" /><stop offset="1" stopColor="#0b3d9c" /></radialGradient>
        <Gloss id="web-s" />
      </defs>
      <rect x="6" y="14" width="96" height="78" rx="6" fill="url(#web-w)" stroke="#2c5fbf" strokeWidth="3" />
      <rect x="6" y="14" width="96" height="16" rx="6" fill="#2a63d8" />
      <circle cx="16" cy="22" r="3" fill="#ff6b5b" /><circle cx="26" cy="22" r="3" fill="#ffd25b" /><circle cx="36" cy="22" r="3" fill="#6bdc6b" />
      <rect x="16" y="40" width="44" height="7" rx="2" fill="#9db4d8" /><rect x="16" y="53" width="60" height="5" rx="2" fill="#c3d1e8" /><rect x="16" y="63" width="52" height="5" rx="2" fill="#c3d1e8" />
      <circle cx="88" cy="86" r="32" fill="url(#web-g)" stroke="#0b3d9c" strokeWidth="2" />
      <g fill="none" stroke="#c8f0ff" strokeOpacity="0.8" strokeWidth="2.2">
        <ellipse cx="88" cy="86" rx="13" ry="32" /><path d="M56 86 H120 M60 70 H116 M60 102 H116" />
      </g>
      <path d="M68 70 q8 -6 14 2 q6 8 -4 12 q-8 4 -4 12 q-12 -6 -6 -26z" fill="#4fd06a" opacity="0.9" />
      <circle cx="88" cy="86" r="32" fill="url(#web-s)" />
    </svg>
  )
}

function Article() {
  return (
    <svg viewBox="0 0 128 128">
      <defs>
        <linearGradient id="art-p" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#e3e6ee" /></linearGradient>
      </defs>
      <path d="M22 10 H86 L106 30 V118 H22 Z" fill="url(#art-p)" stroke="#5a6478" strokeWidth="3" strokeLinejoin="round" />
      <path d="M86 10 V30 H106" fill="#cfd5e2" stroke="#5a6478" strokeWidth="3" strokeLinejoin="round" />
      <rect x="32" y="22" width="46" height="9" rx="1" fill="#111" />
      <rect x="32" y="38" width="64" height="4" fill="#9aa3b5" />
      <rect x="32" y="48" width="30" height="28" fill="#d23a3a" />
      <path d="M32 76 L44 60 L52 68 L62 56 V76 Z" fill="#7a1010" opacity="0.6" />
      {[48, 55, 62, 69].map((y) => <rect key={y} x="67" y={y} width="29" height="3.5" fill="#9aa3b5" />)}
      {[84, 91, 98, 105].map((y) => <rect key={y} x="32" y={y} width={y === 105 ? 40 : 64} height="3.5" fill="#9aa3b5" />)}
    </svg>
  )
}

function Picture() {
  return (
    <svg viewBox="0 0 128 128">
      <defs>
        <linearGradient id="img-f" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffe08a" /><stop offset="0.5" stopColor="#c8911e" /><stop offset="1" stopColor="#8a5a08" /></linearGradient>
        <linearGradient id="img-s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3aa0ff" /><stop offset="1" stopColor="#bde3ff" /></linearGradient>
        <Gloss id="img-g" />
      </defs>
      <rect x="8" y="16" width="112" height="96" rx="4" fill="url(#img-f)" stroke="#6b4300" strokeWidth="2" />
      <rect x="20" y="28" width="88" height="72" fill="url(#img-s)" />
      <circle cx="86" cy="48" r="10" fill="#fff36b" />
      <path d="M20 100 L48 58 L66 82 L80 66 L108 100 Z" fill="#2f8f46" />
      <path d="M20 100 L48 58 L56 70 L38 100 Z" fill="#46b35f" />
      <rect x="20" y="28" width="88" height="36" fill="url(#img-g)" />
    </svg>
  )
}

function Song() {
  return (
    <svg viewBox="0 0 128 128">
      <defs>
        <linearGradient id="song-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#b06ae8" /><stop offset="1" stopColor="#5a1a9a" /></linearGradient>
        <Gloss id="song-g" />
      </defs>
      <path d="M86 40 L108 8" stroke="#555" strokeWidth="4" strokeLinecap="round" />
      <circle cx="108" cy="8" r="4" fill="#ff2ea0" />
      <rect x="10" y="38" width="108" height="76" rx="14" fill="url(#song-b)" stroke="#3a0f66" strokeWidth="3" />
      <circle cx="44" cy="76" r="24" fill="#2a0b4a" />
      {Array.from({ length: 25 }, (_, i) => (
        <circle key={i} cx={30 + (i % 5) * 7} cy={62 + Math.floor(i / 5) * 7} r="2.2" fill="#c9a6ff" opacity="0.8" />
      ))}
      <rect x="76" y="52" width="32" height="14" rx="3" fill="#0d0d0d" />
      <rect x="90" y="54" width="2" height="10" fill="#ff5a5a" />
      <circle cx="84" cy="90" r="9" fill="#ddd" stroke="#333" strokeWidth="2" /><circle cx="104" cy="90" r="9" fill="#ddd" stroke="#333" strokeWidth="2" />
      <rect x="10" y="38" width="108" height="34" rx="14" fill="url(#song-g)" />
    </svg>
  )
}

export function ObjectIcon({ id }: { id: ObjectId }) {
  switch (id) {
    case 'reel': return <Reel />
    case 'website': return <Website />
    case 'article': return <Article />
    case 'image': return <Picture />
    case 'song': return <Song />
  }
}
