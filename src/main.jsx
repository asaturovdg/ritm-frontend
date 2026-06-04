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


const meta = document.createElement('meta');
meta.name = 'color-scheme';
meta.content = 'light only';
document.head.appendChild(meta);

createRoot(document.getElementById('root')).render(
  <BrowserRouter basename="/">
    <StrictMode>
      <AppRoot platform="base">
        <AuthProvider>
          <FiltersProvider>
            <App />
          </FiltersProvider>
        </AuthProvider>
      </AppRoot>
    </StrictMode>
  </BrowserRouter>
);