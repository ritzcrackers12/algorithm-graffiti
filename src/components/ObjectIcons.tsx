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

function Game() {
  return (
    <svg viewBox="0 0 128 128">
      <defs>
        <linearGradient id="game-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6ad08a" /><stop offset="1" stopColor="#1a6a38" /></linearGradient>
        <Gloss id="game-g" />
      </defs>
      <rect x="14" y="40" width="100" height="56" rx="18" fill="url(#game-b)" stroke="#0d3d1e" strokeWidth="3" />
      <rect x="28" y="54" width="28" height="28" rx="4" fill="#0d3d1e" />
      <rect x="36" y="46" width="12" height="44" rx="3" fill="#0d3d1e" />
      <circle cx="86" cy="62" r="8" fill="#d24a3a" />
      <circle cx="100" cy="74" r="8" fill="#3a6ad2" />
      <rect x="14" y="40" width="100" height="24" rx="18" fill="url(#game-g)" />
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
    case 'article': return <Article />
    case 'song': return <Song />
    case 'game': return <Game />
  }
}
