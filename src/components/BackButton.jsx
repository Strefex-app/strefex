import { useNavigate } from 'react-router-dom'
import Icon from './Icon'
import './BackButton.css'

const BackButton = () => {
  const navigate = useNavigate()

  return (
    <div className="back-button-wrapper">
      <button
        type="button"
        className="back-button-bottom stx-click-feedback"
        onClick={() => navigate(-1)}
        aria-label="Go back to previous page"
      >
        <Icon name="arrow-left" size={20} />
        <span>Back</span>
      </button>
    </div>
  )
}

export default BackButton
