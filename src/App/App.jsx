import { useEffect, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Newspaper, User, MessageCircle, FilePlus } from 'lucide-react';

import InviteAccept from '../components/InviteAccept/InviteAccept';
import EventsDigest from '../components/eventsDigest/EventsDigest';
import Event from '../pages/eventPage/Event';
import { Profile } from '../pages/Profile/Profile';
import Feedback from '../pages/Feedback/Feedback';
import Submissions from '../pages/Submissions/Submissions';
import { ThemeWrapper } from '../components/ThemeWrapper';
import { TransitionContext } from '../components/TransitionContext';

import { useTabSwipe } from '../hooks/useTabSwipe';
import './App.css';

const TAB_PATHS = ['/', '/profile', '/feedback', '/submissions'];

const TABS = [
  { id: 'events',      label: 'Дайджест',         Icon: Newspaper,      path: '/' },
  { id: 'profile',     label: 'Профиль',           Icon: User,           path: '/profile' },
  { id: 'feedback',    label: 'Обратная связь',    Icon: MessageCircle,  path: '/feedback' },
  { id: 'submissions', label: 'Заявка',            Icon: FilePlus,       path: '/submissions' },
];

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const prefersReduced = useReducedMotion();

  const prevPathRef = useRef(location.pathname);
  const transitionConfigRef = useRef({ direction: 0, type: 'tab' });
  const deepLinkHandledRef = useRef(false);

  const curr = location.pathname;
  const prev = prevPathRef.current;
  if (prev !== curr) {
    const isTab = (p) => TAB_PATHS.includes(p);
    const isEvent = (p) => p.startsWith('/events/');
    if (isTab(prev) && isTab(curr)) {
      const pi = TAB_PATHS.indexOf(prev);
      const ci = TAB_PATHS.indexOf(curr);
      transitionConfigRef.current = { direction: ci > pi ? 1 : -1, type: 'tab' };
    } else if (isTab(prev) && isEvent(curr)) {
      transitionConfigRef.current = { direction: 0, type: 'event-enter' };
    } else if (isEvent(prev) && isTab(curr)) {
      transitionConfigRef.current = { direction: 0, type: 'event-exit' };
    }
    prevPathRef.current = curr;
  }
  const transitionConfig = transitionConfigRef.current;

  // Telegram deep-links (invite + event)
  useEffect(() => {
    if (deepLinkHandledRef.current) return;
    const startParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param;
    if (startParam?.startsWith('invite_')) {
      deepLinkHandledRef.current = true;
      navigate(`/invite/assistant/${startParam.replace('invite_', '')}`, { replace: true });
    } else if (startParam?.startsWith('event_')) {
      deepLinkHandledRef.current = true;
      navigate(`/events/${startParam.replace('event_', '')}`, { replace: true });
    }
  }, [navigate]);

  // Max deep-links (invite + event)
  useEffect(() => {
    if (deepLinkHandledRef.current) return;
    const startParam =
      window.WebApp?.initDataUnsafe?.start_param ||
      new URLSearchParams(window.location.search).get('WebAppStartParam');
    if (startParam?.startsWith('invite_')) {
      deepLinkHandledRef.current = true;
      navigate(`/invite/assistant/${startParam.replace('invite_', '')}`, { replace: true });
    } else if (startParam?.startsWith('event_')) {
      deepLinkHandledRef.current = true;
      navigate(`/events/${startParam.replace('event_', '')}`, { replace: true });
    }
  }, [navigate]);

  // Telegram back button
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
    if (redirectPath?.startsWith('/invite/assistant/')) {
      navigate(`/invite/assistant/${redirectPath.split('/').pop()}`, { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get('calendar_connected');
    const provider = params.get('provider');
    const calendarError = params.get('calendar_error');

    if (connected === 'true' && provider) {
      localStorage.setItem('calendar_connected', JSON.stringify({ provider, ts: Date.now() }));
      window.history.replaceState({}, '', window.location.pathname);
    } else if (calendarError) {
      localStorage.setItem('calendar_error', JSON.stringify({ error: calendarError, ts: Date.now() }));
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
    const paths = { events: '/', profile: '/profile', feedback: '/feedback', submissions: '/submissions' };
    navigate(paths[tab] ?? '/');
  };

  const activeTab = getActiveTab();
  const isEventPage = location.pathname.startsWith('/events/');
  const bindSwipe = useTabSwipe(location.pathname, !isEventPage);

  // Page slide variants — direction-aware for tabs, fade for event transitions
  const pageVariants = {
    initial: (cfg) => {
      if (prefersReduced) return { opacity: 0 };
      if (cfg.type === 'event-enter') return { opacity: 0, y: 16 };
      if (cfg.type === 'event-exit')  return { opacity: 0, y: 0 };
      return { x: `${cfg.direction > 0 ? 100 : -100}%`, opacity: 0 };
    },
    animate: { x: '0%', y: 0, opacity: 1 },
    exit: (cfg) => {
      if (prefersReduced) return { opacity: 0 };
      if (cfg.type === 'event-enter' || cfg.type === 'event-exit') return { opacity: 0 };
      return { x: `${cfg.direction > 0 ? -100 : 100}%`, opacity: 0 };
    },
  };

  const isEventRoute = curr.startsWith('/events/') || curr.startsWith('/invite/');
  const activeTransition = isEventRoute
    ? { duration: 0.25, ease: 'easeOut' }
    : { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] };

  return (
    <ThemeWrapper>
      <TransitionContext.Provider value={transitionConfig}>
          <div className="app-container">

            <div className="app-content" {...bindSwipe()}>
              <AnimatePresence initial={false} custom={transitionConfig}>
                <motion.div
                  key={location.key}
                  className="page-wrapper"
                  custom={transitionConfig}
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={activeTransition}
                >
                  <Routes location={location}>
                    <Route path='/' element={<EventsDigest />} />
                    <Route path='/events/:id' element={<Event />} />
                    <Route path='/profile' element={<Profile />} />
                    <Route path='/feedback' element={<Feedback />} />
                    <Route path='/submissions' element={<Submissions />} />
                    <Route path='/invite/assistant/:token' element={<InviteAccept />} />
                  </Routes>
                </motion.div>
              </AnimatePresence>
            </div>

            <AnimatePresence>
              {!isEventPage && (
                <motion.nav
                  className="bottom-nav"
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ duration: prefersReduced ? 0 : 0.25, ease: 'easeInOut' }}
                >
                  {TABS.map(({ id, label, Icon }) => {
                    const isActive = activeTab === id;
                    return (
                      <button
                        key={id}
                        className={`nav-btn${isActive ? ' active' : ''}`}
                        onClick={() => handleTabChange(id)}
                      >
                        {isActive && (
                          <motion.span
                            layoutId="nav-indicator"
                            className="nav-indicator"
                            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                          />
                        )}
                        <Icon
                          size={20}
                          strokeWidth={isActive ? 2 : 1.5}
                          className="nav-icon"
                        />
                        <span className="nav-label">{label}</span>
                      </button>
                    );
                  })}
                </motion.nav>
              )}
            </AnimatePresence>

          </div>
        </TransitionContext.Provider>
    </ThemeWrapper>
  );
}
