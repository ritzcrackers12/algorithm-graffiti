// The "don't touch the iPad" warning, in classic Windows-error chrome.
// Triggered by any touch on the display; shows on the iPad AND the active
// phone at once, and is dismissable only from the phone's button.
const FACE = '#c3c3c3'
const bevelOut = {
  borderTop: '2px solid #fff', borderLeft: '2px solid #fff',
  borderRight: '2px solid #3b3b3b', borderBottom: '2px solid #3b3b3b',
} as const

function TitleBar({ small }: { small?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'linear-gradient(90deg,#9a0000,#d40000)', padding: small ? '3px 6px' : '4px 7px', color: '#fff', fontWeight: 'bold', fontSize: small ? 12 : 14 }}>
      <span style={{ display: 'inline-flex', width: small ? 14 : 16, height: small ? 14 : 16, border: '1px solid #fff', alignItems: 'center', justifyContent: 'center', fontSize: small ? 10 : 12, lineHeight: 1 }}>!</span>
      System Warning
    </div>
  )
}

function ErrorIcon({ size }: { size: number }) {
  return (
    <div style={{ flex: '0 0 auto', width: size, height: size, borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%,#ff5a5a,#c20000)', border: '2px solid #7a0000', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: size * 0.62, fontWeight: 'bold', lineHeight: 1 }}>×</div>
  )
}

const overlay = {
  position: 'fixed' as const, inset: 0, zIndex: 2147483000,
  background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
  justifyContent: 'center', padding: 20, fontFamily: "'Tahoma','Geneva',sans-serif",
}

export function TouchWarning({ variant, onContinue }: { variant: 'ipad' | 'phone'; onContinue?: () => void }) {
  if (variant === 'ipad') {
    return (
      <div style={overlay} aria-live="assertive">
        <div style={{ width: 460, maxWidth: '92%', background: FACE, ...bevelOut, boxShadow: '1px 1px 0 #808080, 6px 6px 0 rgba(0,0,0,0.35)' }}>
          <TitleBar />
          <div style={{ padding: '22px 20px 10px', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <ErrorIcon size={46} />
            <div>
              <div style={{ fontSize: 16, fontWeight: 'bold', color: '#000', lineHeight: 1.35 }}>LOOK AT YOUR PHONE AND DON'T TOUCH THE IPAD, STUPID</div>
              <div style={{ fontSize: 12, color: '#1a1a1a', marginTop: 10, lineHeight: 1.45 }}>Error&nbsp;0xYOU — this iPad only serves as a screen; your phone is the vessel for interaction.</div>
            </div>
          </div>
          <div style={{ padding: '6px 0 18px', textAlign: 'center', fontSize: 12, color: '#333', fontStyle: 'italic' }}>→ dismiss this from your phone</div>
        </div>
      </div>
    )
  }
  return (
    <div style={overlay} aria-live="assertive">
      <div style={{ width: 300, maxWidth: '94%', background: FACE, ...bevelOut, boxShadow: '1px 1px 0 #808080, 5px 5px 0 rgba(0,0,0,0.35)' }}>
        <TitleBar small />
        <div style={{ padding: '16px 13px 6px', textAlign: 'center' }}>
          <div style={{ margin: '0 auto 10px' }}><div style={{ margin: '0 auto', width: 38, height: 38 }}><ErrorIcon size={38} /></div></div>
          <div style={{ fontSize: 12, fontWeight: 'bold', color: '#000', lineHeight: 1.3 }}>DON'T TOUCH THE IPAD, STUPID</div>
          <div style={{ fontSize: 10.5, color: '#1a1a1a', marginTop: 7, lineHeight: 1.4 }}>The iPad is just a screen. Your phone is the vessel for interaction.</div>
        </div>
        <div style={{ padding: '8px 13px 16px' }}>
          <button
            type="button"
            onClick={onContinue}
            style={{ width: '100%', textAlign: 'center', padding: '9px 8px', fontSize: 11, fontWeight: 'bold', color: '#000', lineHeight: 1.3, background: FACE, ...bevelOut, outline: '1px dotted #000', outlineOffset: -4, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Click this button on your<br />iPhone to continue
          </button>
        </div>
      </div>
    </div>
  )
}
