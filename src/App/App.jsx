import { useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import InviteAccept from '../components/InviteAccept/InviteAccept';
import EventsDigest from '../components/eventsDigest/EventsDigest';
import Event from '../pages/eventPage/Event';
import { Profile } from '../pages/Profile/Profile';
import Feedback from '../pages/Feedback/Feedback';
import Submissions from '../pages/Submissions/Submissions';
import { ThemeWrapper } from '../components/ThemeWrapper';

import './App.css';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    const startParam = tg?.initDataUnsafe?.start_param;
    if (startParam && startParam.startsWith('invite_')) {
      const inviteToken = startParam.replace('invite_', '');
      navigate(`/invite/assistant/${inviteToken}`, { replace: true });
    }
  }, [navigate]);

  // Обработка кнопки "Назад" в Telegram
  useEffect(() => {
    const tg = window.Telegram?.WebApp;

    if (!tg) return;

    if (location.pathname.includes('/events/')) {
      tg.BackButton.show();

      const handleBack = () => navigate('/');

      tg.onEvent('backButtonClicked', handleBack);

      return () => {
        tg.offEvent('backButtonClicked', handleBack);
        tg.BackButton.hide();
      };
    } else {
      tg.BackButton.hide();
    }
  }, [location, navigate]);


useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const redirectPath = urlParams.get('redirect');

  if (redirectPath && redirectPath.startsWith('/invite/assistant/')) {
    const token = redirectPath.split('/').pop();
    navigate(`/invite/assistant/${token}`, { replace: true });
  }
}, [navigate]);

useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const connected = params.get('calendar_connected');
  const provider = params.get('provider');
  if (connected === 'true' && provider) {
    localStorage.setItem(
      'calendar_connected',
      JSON.stringify({ provider, ts: Date.now() })
    );
    window.history.replaceState({}, '', window.location.pathname);
  }
}, []);

  const getActiveTab = () => {
    if (location.pathname === '/' || location.pathname.includes('/events/')) return 'events';
    if (location.pathname === '/profile') return 'profile';
    if (location.pathname === '/feedback') return 'feedback';
    if (location.pathname === '/submissions') return 'submissions';
    return 'events';
  };

  const handleTabChange = (tab) => {
    switch (tab) {
      case 'events': navigate('/'); break;
      case 'profile': navigate('/profile'); break;
      case 'feedback': navigate('/feedback'); break;
      case 'submissions': navigate('/submissions'); break;
      default: navigate('/');
    }
  };

  const activeTab = getActiveTab();

  return (
    <ThemeWrapper>
      <div className="app-container">

        <div className="app-content">
          <Routes>
            <Route path='/' element={<EventsDigest />} />
            <Route path='/events/:id' element={<Event />} />
            <Route path='/profile' element={<Profile />} />
            <Route path='/feedback' element={<Feedback />} />
            <Route path='/submissions' element={<Submissions />} />
            


            <Route path='/invite/assistant/:token' element={<InviteAccept />} />
          </Routes>
        </div>

        <div className="bottom-nav">
          <button
            className={activeTab === 'events' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => handleTabChange('events')}
          >
            Дайджест
          </button>

          <button
            className={activeTab === 'profile' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => handleTabChange('profile')}
          >
            Профиль
          </button>

          <button
            className={activeTab === 'feedback' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => handleTabChange('feedback')}
          >
            Обратная связь
          </button>

          <button
            className={activeTab === 'submissions' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => handleTabChange('submissions')}
          >
            Заявка
          </button>
        </div>

      </div>
    </ThemeWrapper>
  );
}