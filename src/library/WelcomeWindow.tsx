import { useEffect, type CSSProperties } from 'react'
import { speakAfter, WELCOME_TEXT } from '../components/Welcome.tsx'
import { XpWindow } from './XpWindow.tsx'

// iPad version of the welcome: a classic Windows dialog placed on the desktop
// so it never covers the QR code. Reads itself aloud 5s after it appears;
// dismissed from the phone (OK) or when the visitor opens a piece of media.
export default function WelcomeWindow({ style }: { style?: CSSProperties }) {
  useEffect(() => speakAfter(5000), [])
  return (
    <XpWindow className="welcome-pop" title="Welcome" menu={null} closeOnly style={style}>
      <div className="welcome-pop-body" aria-live="polite">
        <div className="welcome-pop-row">
          <span className="welcome-pop-icon" aria-hidden>i</span>
          <div>
            <div className="welcome-pop-title">Welcome to Algorithm Graffiti!</div>
            <p>{WELCOME_TEXT.replace('Welcome to Algorithm Graffiti! ', '')}</p>
          </div>
        </div>
        <div className="welcome-pop-actions">
          <span className="welcome-pop-btn">Tap OK on your phone</span>
        </div>
      </div>
    </XpWindow>
  )
}
