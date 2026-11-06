import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export const controllerUrl = () => `${location.origin}${location.pathname}#/controller`

export default function QrNote() {
  const [src, setSrc] = useState('')
  useEffect(() => {
    void QRCode.toDataURL(controllerUrl(), { margin: 0, width: 360, errorCorrectionLevel: 'M', color: { dark: '#111111', light: '#ffffff' } }).then(setSrc)
  }, [])
  return (
    <div className="sticky">
      <div>SCAN TO TAKE CONTROL</div>
      {src && <img src={src} alt="QR code to the controller" />}
      <div style={{ fontSize: 11, fontWeight: 400 }}>ONE OPERATOR AT A TIME.</div>
    </div>
  )
}
