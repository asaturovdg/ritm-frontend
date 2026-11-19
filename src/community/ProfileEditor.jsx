import { Link } from 'react-router-dom';
import ContentEditor from './ContentEditor.jsx';
import { useCommunity } from './context.js';
import './Community.css';
export default function ProfileEditor() {
  const { enabled, userId } = useCommunity();
  if (!enabled) return <p className="community">Профили участников пока недоступны для вашего аккаунта.</p>;
  return <main className="community"><Link to="/profile">← Настройки профиля</Link><h1>Профиль участника</h1><Link to={`/members/${userId}`}>Как видят участники</Link><ContentEditor kind="profile" /></main>;
}
