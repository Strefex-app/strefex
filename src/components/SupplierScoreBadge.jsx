export default function SupplierScoreBadge({ score = 0, risk = null }) {
  const numeric = Number(score || 0)
  const tone = numeric >= 80 ? '#067647' : numeric >= 60 ? '#b54708' : '#b42318'
  const bg = numeric >= 80 ? '#ecfdf3' : numeric >= 60 ? '#fff7ed' : '#fef3f2'
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span style={{ background: bg, color: tone, borderRadius: 999, padding: '4px 10px', fontWeight: 700, fontSize: 12 }}>
        Score {numeric.toFixed(1)}
      </span>
      {risk != null && (
        <span style={{ color: '#475467', fontSize: 12 }}>
          Risk {Number(risk || 0).toFixed(1)}
        </span>
      )}
    </div>
  )
}
