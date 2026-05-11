import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import OrnamentTest from './components/OrnamentTest.jsx'

const isTestPage = window.location.hash === '#ornament-test'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isTestPage ? <OrnamentTest /> : <App />}
  </StrictMode>,
)
