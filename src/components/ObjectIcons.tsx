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

function Ad() {
  return (
    <svg viewBox="0 0 128 128">
      <defs>
        <linearGradient id="ad-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f2c14e" /><stop offset="1" stopColor="#b36b12" /></linearGradient>
        <Gloss id="ad-g" />
      </defs>
      <rect x="18" y="22" width="92" height="84" rx="8" fill="url(#ad-b)" stroke="#6a3a08" strokeWidth="3" />
      <rect x="28" y="34" width="72" height="40" rx="4" fill="#1b1408" />
      <rect x="34" y="82" width="44" height="8" rx="2" fill="#1b1408" />
      <rect x="34" y="94" width="28" height="6" rx="2" fill="#6a3a08" />
      <rect x="18" y="22" width="92" height="28" rx="8" fill="url(#ad-g)" />
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


function Chat() {
  return (
    <svg viewBox="0 0 128 128">
      <defs>
        <linearGradient id="chat-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6ad0e8" /><stop offset="1" stopColor="#1a4a9a" /></linearGradient>
        <Gloss id="chat-g" />
      </defs>
      <rect x="16" y="22" width="96" height="70" rx="16" fill="url(#chat-b)" stroke="#0d2a66" strokeWidth="3" />
      <rect x="28" y="38" width="52" height="8" rx="2" fill="#d7f4ff" />
      <rect x="28" y="52" width="72" height="8" rx="2" fill="#d7f4ff" opacity="0.75" />
      <rect x="28" y="66" width="40" height="8" rx="2" fill="#d7f4ff" opacity="0.5" />
      <path d="M40 92 L28 114 L58 92 Z" fill="#1a4a9a" />
      <rect x="16" y="22" width="96" height="28" rx="16" fill="url(#chat-g)" />
    </svg>
  )
}

export function ObjectIcon({ id }: { id: ObjectId }) {
  switch (id) {
    case 'reel': return <Reel />
    case 'article': return <Article />
    case 'ad': return <Ad />
    case 'chat': return <Chat />
  }
}
