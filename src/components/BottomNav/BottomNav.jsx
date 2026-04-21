import { Tabbar } from '@telegram-apps/telegram-ui';
import { useNavigate, useLocation } from 'react-router-dom';
import './BottomNav.css';

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  
  const getActiveTab = () => {
    if (location.pathname === '/') return 'events';
    if (location.pathname === '/favorites') return 'favorites';
    if (location.pathname === '/profile') return 'profile';
    return 'events';
  };

  const handleTabChange = (tab) => {
    switch(tab) {
      case 'events':
        navigate('/');
        break;
      case 'profile':
        navigate('/profile');
        break;
      default:
        navigate('/');
    }
  };

  return (
    <div className="bottom-nav">
      <Tabbar>
        <Tabbar.Item
          selected={getActiveTab() === 'events'}
          onClick={() => handleTabChange('events')}
          text="События"
        >
          
        </Tabbar.Item>
        
        <Tabbar.Item
          selected={getActiveTab() === 'profile'}
          onClick={() => handleTabChange('profile')}
          text="Профиль"
        >
        </Tabbar.Item>
      </Tabbar>
    </div>
  );
}