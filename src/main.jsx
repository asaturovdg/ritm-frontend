import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AppRoot } from '@telegram-apps/telegram-ui'
import '@telegram-apps/telegram-ui/dist/styles.css';


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppRoot>
      <App />
    </AppRoot>
    
  </StrictMode>,
)
