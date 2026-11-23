import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCommunity } from './context.js';
import { useResource } from './useResource.js';
import { Avatar, Pagination } from './CommunityUI.jsx';
import { Users, RefreshCw } from 'lucide-react';
import { eventWindow } from './rules.js';
import ContentEditor from './ContentEditor.jsx';
import PublicationList from './PublicationList.jsx';
import './Community.css';

export default function EventCommunity({ event }) {
  const { enabled } = useCommunity();
  return enabled ? <LoadedEventCommunity key={event.id} event={event} /> : null;
}
function LoadedEventCommunity({ event }) {
  const { request, userId } = useCommunity();
  const [version, setVersion] = useState(0);
  const [now, setNow] = useState(Date.now);
  const window = eventWindow(event, now);
  const loadProfile = useCallback(async () => {
    try { return await request(`/member-profiles/${userId}`); }
    catch (error) { if (error.status === 404) return null; throw error; }
  }, [request, userId]);
  const profile = useResource(loadProfile);
  useEffect(() => {
    const next = [window.start, window.end].filter(time => Number.isFinite(time) && time > now).sort((a, b) => a - b)[0];
    if (!next) return;
    const timer = setTimeout(() => { setNow(Date.now()); setVersion(v => v + 1); }, Math.min(next - now + 10, 2147483647));
    return () => clearTimeout(timer);
  }, [window.start, window.end, now]);
  const changed = () => { setVersion(v => v + 1); profile.reload(); };
  return <section className="community community-event"><h2>Сообщество</h2>
    <p>Поделитесь опытом или найдите коллег для общего похода.</p>
    {profile.error && <p role="alert">{profile.error.message}<button onClick={profile.reload}>Повторить</button></p>}
    {!profile.loading && !profile.data && !profile.error && <p>Для своих публикаций нужен одобренный <Link to="/members/me/edit">профиль участника</Link>.</p>}
    <Companions key={`companions:${version}`} event={event} upcoming={window.upcoming} profile={profile.data} />
    <PublicationList key={`recommendations:${version}`} path={`/events/${event.id}/recommendations`} kind="recommendation" source="event" />
    <ContentEditor collapsible kind="recommendation" eventId={event.id} canWrite={Boolean(profile.data) && window.upcoming} onChanged={changed} />
    <PublicationList key={`experiences:${version}`} path={`/events/${event.id}/experiences`} kind="experience" source="event" />
    <ContentEditor collapsible kind="experience" eventId={event.id} canWrite={Boolean(profile.data) && window.ended} onChanged={changed} />
  </section>;
}
function Companions({ event, upcoming, profile }) {
  const { request } = useCommunity();
  const [offset, setOffset] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const load = useCallback(async () => {
    const [state, list] = await Promise.all([
      request(`/events/${event.id}/companion-request`),
      request(`/events/${event.id}/companions?limit=20&offset=${offset}`),
    ]);
    return { state, list };
  }, [request, event.id, offset]);
  const { data, loading, error: loadError, reload } = useResource(load, { keepPreviousData: true });
  const toggle = async () => {
    if (lock.current || !data) return;
    lock.current = true; setBusy(true); setError('');
    try {
      await request(`/events/${event.id}/companion-request`, { method: data.state.enabled ? 'DELETE' : 'PUT' });
    } catch (e) { if (e.name !== 'AbortError') setError(e.message); }
    finally { lock.current = false; setBusy(false); reload(); }
  };
  return <section className="community-card community-companions"><div className="community-section-heading"><h3><Users size={18} aria-hidden="true" />Ищу компанию</h3><button type="button" className="community-icon-button" disabled={loading || busy} onClick={reload} aria-label="Обновить участников"><RefreshCw size={15} /></button></div><p className="community-hint">Найдите коллег для общего похода. Отметка «Пойду» и календарь не меняются.</p>
    {!upcoming && <p>Поиск доступен только до начала события с известной датой.</p>}
    {!profile?.contact_url && <p>Для включения нужны опубликованные <Link to="/members/me/edit">профиль и контакт</Link>.</p>}
    <label className="community-check community-company-toggle"><input type="checkbox" checked={Boolean(upcoming && data?.state.enabled)} disabled={loading || busy || Boolean(loadError) || !data || (!data?.state.enabled && (!upcoming || !profile?.contact_url))} onChange={toggle} />Ищу компанию</label>
    {loading && <p role="status">Обновляем поиск компании…</p>}{(loadError || error) && <p role="alert">{loadError?.message || error}</p>}
    {loadError && data && <p>Показано последнее подтверждённое состояние. Обновите данные перед изменением.</p>}
    {data && <><p className="community-hint">Участников: {data.list.total}</p><ul className="community-people">{data.list.items.map(member => <li key={member.user_id}><Link className="community-author" to={`/members/${member.user_id}?source=companions`}><Avatar name={member.name} photoUrl={member.photo_url} small /><span>{member.name}</span></Link></li>)}</ul>
      <Pagination offset={offset} total={data.list.total} count={data.list.items.length} onPage={setOffset} disabled={busy} /></>}
  </section>;
}
