import { getQualityTraining } from '../../data/qualityExcellenceTraining'

export default function QualityToolTraining({ tool }) {
  const training = getQualityTraining(tool.id)
  if (!training) return null

  return (
    <details className="qe-train" open>
      <summary className="qe-train__summary">
        <span className="stx-text-heading">Training</span>
        <span className="stx-text-caption">Read before you create a record</span>
      </summary>
      <ul className="qe-train__list">
        {training.bullets.map((item) => (
          <li key={item} className="stx-text-small stx-text-wrap">{item}</li>
        ))}
      </ul>
    </details>
  )
}
