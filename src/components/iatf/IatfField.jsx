export default function IatfField({ label, children }) {
  return (
    <label className="iatf-field">
      <span className="stx-text-caption">{label}</span>
      {children}
    </label>
  )
}
