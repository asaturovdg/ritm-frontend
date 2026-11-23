import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, BookOpen, CalendarDays, RefreshCw, ThumbsUp } from 'lucide-react';
import { useCommunity } from './context.js';
import { useResource } from './useResource.js';
import { Avatar, Pagination } from './CommunityUI.jsx';
import ExperienceReader from './ExperienceReader.jsx';
import Unpublish from './Unpublish.jsx';

export default function PublicationList({ path, kind, source, profileUserId, onCount, compact = false }) {
  const { request } = useCommunity();
  const [offset, setOffset] = useState(0);
  const load = useCallback(async () => {
    const page = await request(`${path}?limit=20&offset=${offset}`);
    const ids = [...new Set(page.items.map(item => item.event_id))];
    let events = [];
    if (ids.length) {
      try {
        const data = await request(`/events/by-ids?${ids.map(id => `ids=${id}`).join('&')}`);
        events = Array.isArray(data) ? data : [];
      } catch (error) { if (error.name === 'AbortError' || error.status === 401) throw error; }
    }
    return { ...page, events: Object.fromEntries(events.map(event => [event.id, event])) };
  }, [request, path, offset]);
  const { data, loading, error, reload } = useResource(load);
  useEffect(() => { if (data) onCount?.(data.total); }, [data, onCount]);
  const title = kind === 'experience' ? 'Рассказы участников' : 'Рекомендации участников';
  const Icon = kind === 'experience' ? BookOpen : ThumbsUp;
  if (loading) return <p className="community-loading" role="status">Загрузка публикаций…</p>;
  if (error) return <p className="community-notice" role="alert">{error.message} <button onClick={reload}>Повторить</button></p>;
  return <section className="community-publications" aria-label={title}>
    <div className="community-section-heading">{!compact ? <h3>{title}<span className="community-count">{data.total}</span></h3> : <span className="community-hint">Публикаций: {data.total}</span>}<button className="community-icon-button" aria-label={`Обновить ${kind === 'experience' ? 'рассказы' : 'рекомендации'}`} onClick={reload}><RefreshCw size={15} /></button></div>
    {!data.items.length && <div className="community-empty"><Icon size={23} aria-hidden="true" /><h3>{kind === 'experience' ? 'Рассказы ещё впереди' : 'Пока нет рекомендаций'}</h3><p>Опубликованные записи появятся здесь после проверки.</p></div>}
    {data.items.map(item => {
      const event = data.events[item.event_id];
      const date = event?.start_date ? new Date(`${event.start_date}T12:00:00+03:00`).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', timeZone: 'Europe/Moscow' }) : '';
      const place = Array.isArray(event?.city) ? event.city.join(', ') : event?.city;
      return <article className="community-card community-publication" key={item.id}>
        {!profileUserId ? <Author userId={item.user_id} source={source} /> : <span className="community-publication-kind"><Icon size={14} aria-hidden="true" />{kind === 'experience' ? 'Рассказ об участии' : 'Рекомендует'}</span>}
        <h3><Link to={`/events/${item.event_id}`}>{event?.title || event?.name || `Мероприятие №${item.event_id}`}</Link></h3>
        {(date || place) && <p className="community-event-meta"><CalendarDays size={14} aria-hidden="true" />{[date, place].filter(Boolean).join(', ')}</p>}
        {kind === 'experience' ? <><ExperienceReader publication={item} source={source} /><p className="community-hint">Об участии сообщил автор.</p></> : <p className="community-text">{item.text || 'Рекомендую это мероприятие'}</p>}
        <Link className="community-event-link" to={`/events/${item.event_id}`}>К мероприятию<ArrowUpRight size={15} aria-hidden="true" /></Link>
        <Unpublish kind={kind} id={item.id} onDone={reload} />
      </article>;
    })}
    <Pagination offset={offset} total={data.total} count={data.items.length} onPage={setOffset} />
  </section>;
}
function Author({ userId, source }) {
  const { request } = useCommunity();
  const load = useCallback(() => request(`/member-profiles/${userId}`), [request, userId]);
  const { data } = useResource(load);
  const name = data?.name || `Участник №${userId}`;
  return <Link className="community-author" to={`/members/${userId}?source=${source}`}><Avatar name={name} photoUrl={data?.photo_url} small /><span>{name}</span></Link>;
}
