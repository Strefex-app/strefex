import './SupplierRating.css'

const SupplierRating = () => {
  const renderStars = (filled, total = 5, color = 'yellow') => {
    return Array.from({ length: total }, (_, i) => (
      <span key={i} className={`star ${i < filled ? 'filled' : ''} ${color}`}>
        ★
      </span>
    ))
  }

  return (
    <div className="supplier-rating">
      <div className="supplier-rating-header">
        <h3 className="supplier-rating-title">Supplier Rating</h3>
      </div>
      <div className="supplier-rating-content">
        <div className="rating-row">
          <div className="stars-container">
            {renderStars(3, 5, 'blue')}
          </div>
        </div>
        <div className="rating-row rating-row-main">
          <div className="stars-container">
            {renderStars(2, 5, 'yellow')}
          </div>
          <div className="rating-value">
            <span className="rating-number">4.5</span>
            <span className="rating-superscript">2</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SupplierRating
