import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { clearDeprecatedLocalStorageOnce } from './utils/clearDeprecatedLocalStorageOnce'
import './index.css'
import './styles/typography.css'
import './styles/responsive-tables.css'
import { registerServiceWorker } from './registerSW'

clearDeprecatedLocalStorageOnce()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

registerServiceWorker()
