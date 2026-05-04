import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { clearDeprecatedLocalStorageOnce } from './utils/clearDeprecatedLocalStorageOnce'
import './index.css'
import './styles/typography.css'
/* After index + typography so RFQ overrides (incl. #root headings) reliably when .rfqi-scope is present */
import './styles/rfq-intelligence-dark.css'
import './styles/responsive-tables.css'
/* After all routes — RFQ shell beats legacy light hex in lazily-loaded page CSS */
import './styles/platform-rfq-shell.css'
import { registerServiceWorker } from './registerSW'

clearDeprecatedLocalStorageOnce()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

registerServiceWorker()
