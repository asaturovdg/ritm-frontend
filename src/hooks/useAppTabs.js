import { Newspaper, User, MessageCircle, FilePlus, Sparkles } from 'lucide-react';
import { useAuth } from '../components/AuthContext.jsx';
import { FEATURED_ALLOWLIST, hasFeature } from '../data/featureFlags.js';

const BASE_TABS = [
  { id: 'events',      label: 'Дайджест',          Icon: Newspaper,      path: '/' },
  { id: 'profile',     label: 'Профиль',           Icon: User,           path: '/profile' },
  { id: 'feedback',    label: 'Обратная связь',    Icon: MessageCircle,  path: '/feedback' },
  { id: 'submissions', label: 'Заявка',            Icon: FilePlus,       path: '/submissions' },
];
const FEATURED_TAB = { id: 'featured', label: 'Подборки', Icon: Sparkles, path: '/featured' };

export function useAppTabs() {
  const { userId } = useAuth();
  const hasFeatured = hasFeature(FEATURED_ALLOWLIST, userId);
  const TABS = hasFeatured ? [FEATURED_TAB, ...BASE_TABS] : BASE_TABS;
  const TAB_PATHS = TABS.map((tab) => tab.path);
  return { TABS, TAB_PATHS, hasFeatured };
}
