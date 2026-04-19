import { useEffect, useState } from 'react';
import { Tabbar } from '@telegram-apps/telegram-ui';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import EventsDigest from './components/eventsDigest/EventsDigest';
import Event from './pages/eventPage/Event';
import './App.css';

const Profile = () => (
  <div style={{ padding: '20px', textAlign: 'center' }}>
    <h2>Профиль</h2>
  </div>
);

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [filters, setFilters] = useState({
    cities: [],
    categories: [],
    eventTypes: [],
    participationTypes: []
  });

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      if (location.pathname.includes('/events/')) {
        tg.BackButton.show();
        
        const handleBack = () => {
          navigate('/');
        };
        
        tg.onEvent('backButtonClicked', handleBack);
        
        return () => {
          tg.offEvent('backButtonClicked', handleBack);
          tg.BackButton.hide();
        };
      } else {
        tg.BackButton.hide();
      }
    }
  }, [location, navigate]);

  const getActiveTab = () => {
    if (location.pathname === '/' || location.pathname.includes('/events/')) return 'events';
    if (location.pathname === '/profile') return 'profile';
    return 'events';
  };

  const handleTabChange = (tab) => {
    if (tab === 'events') {
      navigate('/');
    } else if (tab === 'profile') {
      navigate('/profile');
    }
  };

  return (
    <div className="app-container">
      <div className="app-content" style={{ paddingBottom: '70px' }}>
        <Routes>
          <Route path='/' element={<EventsDigest filters={filters} setFilters={setFilters} />} />
          <Route path='/events/:id' element={<Event />} />
          <Route path='/profile' element={<Profile />} />
        </Routes>
      </div>
      
      <div className="bottom-nav">
        <Tabbar>
          <Tabbar.Item
            selected={getActiveTab() === 'events'}
            onClick={() => handleTabChange('events')}
            text="Мероприятия"
          />
          <Tabbar.Item
            selected={getActiveTab() === 'profile'}
            onClick={() => handleTabChange('profile')}
            text="Профиль"
          />
        </Tabbar>
      </div>
    </div>
  );
}