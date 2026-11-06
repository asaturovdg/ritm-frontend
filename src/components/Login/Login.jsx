import { useState } from 'react';
import { Button } from '@telegram-apps/telegram-ui';
import { useAuth } from '../AuthContext.jsx';
import TelegramLoginWidget from '../TelegramLoginWidget/TelegramLoginWidget.jsx';
import './Login.css';

export default function Login() {
  const { setShowInputCode, setToken, setIsAuthReady, refreshUserData } = useAuth();
  const [code, setCode] = useState('');
  const [loginError, setLoginError] = useState('');
  const [widgetReady, setWidgetReady] = useState(false);
  const isDevMode = import.meta.env.VITE_DEV_MODE !== 'false';

  const handleLogin = async () => {
    if (!code.trim()) return;
    setLoginError('');
    try {
      const res = await fetch('https://ritmevents.ru/api/v1/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        setShowInputCode(false);
        window.location.reload();
      } else {
        setLoginError('Неверный или истёкший код. Попробуйте ещё раз.');
      }
    } catch {
      setLoginError('Ошибка соединения. Попробуйте позже.');
    }
  };

  return (
    <div className="events">
      <div className="login-container">
        <h2>Вход</h2>
        <TelegramLoginWidget
          onSuccess={({ access_token, refresh_token }) => {
            localStorage.setItem('access_token', access_token);
            localStorage.setItem('refresh_token', refresh_token);
            setToken(access_token);
            refreshUserData(access_token).then((user) => {
              if (user) {
                setIsAuthReady(true);
                setShowInputCode(false);
              }
            });
          }}
          onError={(msg) => setLoginError(msg)}
          onStatusChange={(status) => setWidgetReady(status === 'ready')}
        />
        {isDevMode && widgetReady && <p className="login-divider">— или —</p>}
        {isDevMode && (
          <>
            <p>Получите код, написав <b>/login</b> боту <b>@ritmevents_bot</b>, и введите его ниже</p>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Введите код"
              maxLength={6}
              className="login-input"
            />
            <Button mode="filled" stretched size="m" onClick={handleLogin}>Войти</Button>
          </>
        )}
        {loginError && <p className="login-error">{loginError}</p>}
      </div>
    </div>
  );
}
