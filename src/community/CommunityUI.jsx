import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, UserRound } from 'lucide-react';
import { STATE_LABELS } from './rules.js';

export function Avatar({ name = '', photoUrl, small = false }) {
  const [failedUrl, setFailedUrl] = useState(null);
  const initials = name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  return <span className={`community-avatar${small ? ' community-avatar--small' : ''}`} aria-hidden="true">
    {photoUrl && failedUrl !== photoUrl ? <img src={photoUrl} alt="" referrerPolicy="no-referrer" onError={() => setFailedUrl(photoUrl)} /> : initials || <UserRound size={small ? 16 : 24} />}
  </span>;
}
export function PageHeader({ title, backTo = '/', backLabel = 'К мероприятиям', children }) {
  return <header className="community-page-header"><Link className="community-icon-button" to={backTo} aria-label={backLabel}><ArrowLeft size={18} /></Link><h1>{title}</h1>{children}</header>;
}
export function StatusBadge({ state = 'draft' }) {
  return <span className={`community-status community-status--${state}`}>{STATE_LABELS[state] || 'Без отправленной версии'}</span>;
}
export function Pagination({ offset, total, count, onPage, disabled = false }) {
  if (!offset && total <= 20) return null;
  return <nav className="community-pagination" aria-label="Страницы списка"><button type="button" disabled={disabled || !offset} onClick={() => onPage(Math.max(0, offset - 20))}><ChevronLeft size={15} aria-hidden="true" />Назад</button><span>{count ? offset + 1 : 0}–{count ? offset + count : 0} из {total}</span><button type="button" disabled={disabled || offset + count >= total} onClick={() => onPage(offset + 20)}>Далее<ChevronRight size={15} aria-hidden="true" /></button></nav>;
}
