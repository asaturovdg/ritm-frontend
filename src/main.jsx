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
import { ThemeProvider, useTheme } from './components/ThemeContext.jsx'
import { WhatsNewProvider } from './components/WhatsNew/WhatsNewContext.jsx'
import WhatsNewModal from './components/WhatsNew/WhatsNewModal.jsx'
import { SavedEventsProvider } from './components/SavedEventsContext.jsx'
import { NotInterestedProvider } from './components/NotInterestedContext.jsx'

function ThemedAppRoot({ children }) {
  const { theme } = useTheme();
  return (
    <AppRoot platform="base" appearance={theme}>
      {children}
    </AppRoot>
  );
}

createRoot(document.getElementById('root')).render(
  <BrowserRouter basename="/">
    <StrictMode>
      <ThemeProvider>
        <ThemedAppRoot>
          <WhatsNewProvider>
            <AuthProvider>
              <SavedEventsProvider>
                <NotInterestedProvider>
                  <ToastProvider>
                    <FiltersProvider>
                      <App />
                    </FiltersProvider>
                  </ToastProvider>
                </NotInterestedProvider>
              </SavedEventsProvider>
            </AuthProvider>
            <WhatsNewModal />
          </WhatsNewProvider>
        </ThemedAppRoot>
      </ThemeProvider>
    </StrictMode>
  </BrowserRouter>
);