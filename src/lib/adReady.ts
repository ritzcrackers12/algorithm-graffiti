import { ADS, type AdPlacement } from '../shared/ads.ts'
import { asset } from './content.ts'

const warmed = new Set<string>()

export function adImageUrl(image: string) {
  return asset(image)
}

export function preloadAdImage(image: string) {
  if (!image || typeof document === 'undefined') return
  const src = adImageUrl(image)
  if (warmed.has(src)) return
  const img = new Image()
  img.decoding = 'async'
  img.src = src
  void img.decode?.().catch(() => {})
  if (img.complete && img.naturalWidth > 0) warmed.add(src)
  else img.onload = () => warmed.add(src)
}

export function preloadAdCatalog() {
  for (const ad of ADS) preloadAdImage(ad.image)
}

export function adImageReady(image: string) {
  if (!image || typeof document === 'undefined') return false
  const src = adImageUrl(image)
  if (warmed.has(src)) return true
  const img = new Image()
  img.src = src
  return img.complete && img.naturalWidth > 0
}

export function preloadPlacement(place: AdPlacement | null | undefined) {
  if (place?.image) preloadAdImage(place.image)
}
