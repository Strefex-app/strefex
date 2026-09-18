import { useRef } from 'react'
import { COMPANY_PACK_SLOTS, pickLatestForSlot } from '../utils/companyProfilePack'
import './CompanyProfilePackFields.css'

/**
 * Dedicated presentation / profile / portfolio slots for Profile and Superadmin backup.
 */
export default function CompanyProfilePackFields({
  files = [],
  pendingBySlot = {},
  disabled = false,
  canUpload = true,
  onPickFile,
  onClearPending,
  onRemoveStored,
  hint,
}) {
  const inputRefs = useRef({})

  return (
    <div className="stx-pack">
      {hint ? <p className="stx-pack__hint">{hint}</p> : null}
      <div className="stx-pack__grid">
        {COMPANY_PACK_SLOTS.map((slot) => {
          const stored = pickLatestForSlot(files, slot.id)
          const pending = pendingBySlot[slot.id] || null
          const label = pending?.name || stored?.name
          return (
            <div key={slot.id} className="stx-pack__slot">
              <div className="stx-pack__slot-head">
                <span className="stx-pack__slot-title">
                  {slot.shortLabel}
                  {slot.required ? <span className="stx-pack__req">Required for full profile</span> : null}
                </span>
                <p className="stx-pack__slot-hint">{slot.hint}</p>
              </div>
              <p className={`stx-pack__file${label ? '' : ' is-empty'}`}>
                {label || 'No file yet'}
                {pending ? <span className="stx-pack__pending"> · pending upload</span> : null}
              </p>
              <div className="stx-pack__actions">
                <input
                  ref={(el) => { inputRefs.current[slot.id] = el }}
                  type="file"
                  accept={slot.accept}
                  hidden
                  disabled={disabled || !canUpload}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    e.target.value = ''
                    if (file && onPickFile) onPickFile(slot.id, file)
                  }}
                />
                <button
                  type="button"
                  className="stx-pack__btn"
                  disabled={disabled || !canUpload}
                  onClick={() => inputRefs.current[slot.id]?.click()}
                >
                  {stored || pending ? 'Replace' : 'Upload'}
                </button>
                {pending ? (
                  <button
                    type="button"
                    className="stx-pack__btn stx-pack__btn--ghost"
                    disabled={disabled}
                    onClick={() => onClearPending?.(slot.id)}
                  >
                    Undo
                  </button>
                ) : null}
                {!pending && stored?.path ? (
                  <button
                    type="button"
                    className="stx-pack__btn stx-pack__btn--ghost"
                    disabled={disabled}
                    onClick={() => onRemoveStored?.(stored)}
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
