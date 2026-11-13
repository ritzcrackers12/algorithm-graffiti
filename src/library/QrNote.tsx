import { useEffect, useState, type CSSProperties } from 'react'
import QRCode from 'qrcode'
import { XpWindow } from './XpWindow.tsx'

export const controllerUrl = () => `${location.origin}${location.pathname}#/controller`

export default function QrNote({ style }: { style?: CSSProperties }) {
  const [src, setSrc] = useState('')
  useEffect(() => {
    void QRCode.toDataURL(controllerUrl(), { margin: 0, width: 360, errorCorrectionLevel: 'M', color: { dark: '#111111', light: '#ffffff' } }).then(setSrc)
  }, [])
  return (
    <XpWindow className="qr-pop sticky" title="Scan QR Code" menu={null} closeOnly style={style}>
      <div className="qr-pop-body">
        {src && <img src={src} alt="QR code to the controller" />}
        <p>One operator at a time.</p>
      </div>
    </XpWindow>
  )
}
