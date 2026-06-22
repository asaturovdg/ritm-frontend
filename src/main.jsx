import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HashRouter } from 'react-router-dom'
import { AppRoot } from '@telegram-apps/telegram-ui'
import '@telegram-apps/telegram-ui/dist/styles.css';
import './index.css'
import App from './App/App'
import { AuthProvider } from './components/AuthContext.jsx'
import { FiltersProvider } from './components/FiltersContext.jsx'
import { ToastProvider } from './components/Toast/ToastContext.jsx'
import { WhatsNewProvider } from './components/WhatsNew/WhatsNewContext.jsx'
import WhatsNewModal from './components/WhatsNew/WhatsNewModal.jsx'


const meta = document.createElement('meta');
meta.name = 'color-scheme';
meta.content = 'light only';
document.head.appendChild(meta);

createRoot(document.getElementById('root')).render(
  <BrowserRouter basename="/">
    <StrictMode>
      <AppRoot platform="base">
        <WhatsNewProvider>
          <AuthProvider>
            <ToastProvider>
              <FiltersProvider>
                <App />
              </FiltersProvider>
            </ToastProvider>
          </AuthProvider>
          <WhatsNewModal />
        </WhatsNewProvider>
      </AppRoot>
    </StrictMode>
  </BrowserRouter>
);