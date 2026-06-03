import { useEffect, useState } from 'react'
import {
  AUTH_BACKGROUND_IMAGE,
  AUTH_BACKGROUND_IMAGE_MOBILE,
  AUTH_BACKGROUND_WEBP,
  AUTH_BACKGROUND_WEBP_MOBILE,
} from '../constants/authPageAssets'
import '../styles/authPageBackdrop.css'

/**
 * Navy base shows instantly; decorative image lazy-loads after idle (authPageAssets.js).
 */
export default function AuthPageBackdrop() {
  const [loadImage, setLoadImage] = useState(false)
  const [imageReady, setImageReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    const start = () => {
      if (!cancelled) setLoadImage(true)
    }
    if (typeof requestIdleCallback === 'function') {
      const id = requestIdleCallback(start, { timeout: 900 })
      return () => {
        cancelled = true
        cancelIdleCallback(id)
      }
    }
    const t = window.setTimeout(start, 350)
    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [])

  return (
    <div className="auth-page-backdrop" aria-hidden>
      {loadImage ? (
        <picture className="auth-page-backdrop__picture">
          <source type="image/webp" media="(min-width: 1280px)" srcSet={AUTH_BACKGROUND_WEBP} />
          <source type="image/jpeg" media="(min-width: 1280px)" srcSet={AUTH_BACKGROUND_IMAGE} />
          <source type="image/webp" srcSet={AUTH_BACKGROUND_WEBP_MOBILE} />
          <img
            src={AUTH_BACKGROUND_IMAGE_MOBILE}
            alt=""
            className={`auth-page-backdrop__image${imageReady ? ' auth-page-backdrop__image--visible' : ''}`}
            decoding="async"
            loading="lazy"
            fetchPriority="low"
            onLoad={() => setImageReady(true)}
          />
        </picture>
      ) : null}
      <div className="auth-page-backdrop__scrim" />
    </div>
  )
}
