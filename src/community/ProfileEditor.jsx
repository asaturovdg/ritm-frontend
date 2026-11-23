import { Link } from 'react-router-dom';
import { Eye } from 'lucide-react';
import ContentEditor from './ContentEditor.jsx';
import { PageHeader } from './CommunityUI.jsx';
import { useCommunity } from './context.js';
import './Community.css';

export default function ProfileEditor() {
  const { enabled, userId } = useCommunity();
  if (!enabled) return <p className="community">Профили участников пока недоступны для вашего аккаунта.</p>;
  return <main className="community"><PageHeader title="Мой профиль" backTo="/profile" backLabel="Настройки профиля"><Link className="community-icon-button" to={`/members/${userId}`} aria-label="Как видят участники"><Eye size={18} /></Link></PageHeader><ContentEditor kind="profile" /></main>;
}
