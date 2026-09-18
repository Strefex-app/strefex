import { useEffect, useMemo, useRef, useState } from 'react'
import { blobUrlFromSignedPath, catalogueFramesFromAttachments } from '../utils/companyPackCatalogue'
import { companyProfileAttachmentsService, isSupabaseConfigured } from '../services/supabaseService'
import './CompanyPackCarousel.css'

/**
 * In-platform review carousel. Frames are pictures only — no download / open-file actions.
 */
export default function CompanyPackCarousel({
  attachments = [],
  frames: framesProp = null,
  getSignedUrl,
  emptyLabel = 'No catalogue pictures yet. Upload a PDF pack, then save.',
}) {
  const signedUrlRef = useRef(getSignedUrl || ((path, exp) => companyProfileAttachmentsService.getSignedUrl(path, exp)))
  signedUrlRef.current = getSignedUrl || ((path, exp) => companyProfileAttachmentsService.getSignedUrl(path, exp))
  const metaFrames = useMemo(
    () => (Array.isArray(framesProp) && framesProp.length
      ? framesProp
      : catalogueFramesFromAttachments(attachments)),
    [attachments, framesProp],
  )
  const [loaded, setLoaded] = useState([])
  const [index, setIndex] = useState(0)
  const [error, setError] = useState('')
  const scrollerRef = useRef(null)
  const urlsRef = useRef([])

  useEffect(() => {
    let cancelled = false
    urlsRef.current.forEach((u) => URL.revokeObjectURL(u))
    urlsRef.current = []
    setLoaded([])
    setIndex(0)
    setError('')
    if (!metaFrames.length || !isSupabaseConfigured) return undefined

    ;(async () => {
      const next = []
      for (const frame of metaFrames) {
        try {
          const src = await blobUrlFromSignedPath(frame.path, signedUrlRef.current)
          if (cancelled) {
            if (src) URL.revokeObjectURL(src)
            return
          }
          if (src) {
            urlsRef.current.push(src)
            next.push({ ...frame, src })
          }
        } catch {
          /* skip frame */
        }
      }
      if (!cancelled) {
        setLoaded(next)
        if (!next.length) setError('Catalogue pictures are not available for review yet.')
      }
    })()

    return () => {
      cancelled = true
      urlsRef.current.forEach((u) => URL.revokeObjectURL(u))
      urlsRef.current = []
    }
  }, [metaFrames])

  const go = (dir) => {
    if (!loaded.length) return
    const next = (index + dir + loaded.length) % loaded.length
    setIndex(next)
    const el = scrollerRef.current
    const child = el?.children?.[next]
    if (child?.scrollIntoView) child.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }

  if (!metaFrames.length) {
    return <p className="stx-pack-carousel__empty">{emptyLabel}</p>
  }

  return (
    <div className="stx-pack-carousel">
      <p className="stx-pack-carousel__notice">
        In-platform review only. Pictures cannot be downloaded from this catalogue.
      </p>
      {error ? <p className="stx-pack-carousel__empty">{error}</p> : null}
      <div className="stx-pack-carousel__stage">
        <button type="button" className="stx-pack-carousel__nav" onClick={() => go(-1)} aria-label="Previous picture" disabled={loaded.length < 2}>
          ‹
        </button>
        <div
          className="stx-pack-carousel__scroller"
          ref={scrollerRef}
          onContextMenu={(e) => e.preventDefault()}
        >
          {(loaded.length ? loaded : metaFrames.map((f) => ({ ...f, src: '' }))).map((frame, i) => (
            <figure key={`${frame.path || i}`} className={`stx-pack-carousel__slide${i === index ? ' is-active' : ''}`}>
              <div className="stx-pack-carousel__frame">
                {frame.src ? (
                  <img
                    src={frame.src}
                    alt=""
                    draggable={false}
                    onDragStart={(e) => e.preventDefault()}
                  />
                ) : (
                  <div className="stx-pack-carousel__ph">Loading…</div>
                )}
                <span className="stx-pack-carousel__shield" aria-hidden="true" />
              </div>
              <figcaption className="stx-pack-carousel__cap">{frame.caption}</figcaption>
            </figure>
          ))}
        </div>
        <button type="button" className="stx-pack-carousel__nav" onClick={() => go(1)} aria-label="Next picture" disabled={loaded.length < 2}>
          ›
        </button>
      </div>
      {loaded.length > 1 ? (
        <div className="stx-pack-carousel__dots" role="tablist" aria-label="Catalogue pictures">
          {loaded.map((frame, i) => (
            <button
              key={frame.path}
              type="button"
              className={i === index ? 'is-on' : ''}
              aria-label={`Picture ${i + 1}`}
              onClick={() => {
                setIndex(i)
                scrollerRef.current?.children?.[i]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function CompanyPackReviewModal({ title, attachments, frames, onClose }) {
  if (!onClose) return null
  return (
    <div className="stx-pack-review" onClick={onClose} role="presentation">
      <div
        className="stx-pack-review__panel"
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Company catalogue'}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="stx-pack-review__top">
          <h2 className="stx-pack-review__title">{title || 'Company catalogue'}</h2>
          <button type="button" className="stx-pack-review__close" onClick={onClose} aria-label="Close catalogue">
            ×
          </button>
        </div>
        <CompanyPackCarousel attachments={attachments} frames={frames} />
      </div>
    </div>
  )
}
