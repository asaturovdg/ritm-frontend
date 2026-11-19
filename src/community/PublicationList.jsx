import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCommunity } from './context.js';
import { useResource } from './useResource.js';
import ExperienceReader from './ExperienceReader.jsx';
import Unpublish from './Unpublish.jsx';

export default function PublicationList({ path, kind, source, profileUserId }) {
  const { request } = useCommunity();
  const [offset, setOffset] = useState(0);
  const load = useCallback(() => request(`${path}?limit=20&offset=${offset}`), [request, path, offset]);
  const { data, loading, error, reload } = useResource(load);
  if (loading) return <p role="status">Загрузка публикаций…</p>;
  if (error) return <p role="alert">{error.message} <button onClick={reload}>Повторить</button></p>;
  return <section>
    <div className="community-actions"><h3>{kind === 'experience' ? 'Рассказы участников' : 'Рекомендации участников'} · {data.total}</h3><button onClick={reload}>Обновить список</button></div>
    {!data.items.length && <p>Пока нет опубликованных записей.</p>}
    {data.items.map(item => <article className="community-card" key={item.id}>
      {!profileUserId && <Author userId={item.user_id} source={source} />}
      <p><Link to={`/events/${item.event_id}`}>Мероприятие №{item.event_id}</Link></p>
      {kind === 'experience' ? <><p className="community-hint">Автор заявил об участии; сервис не подтверждает посещение.</p><ExperienceReader publication={item} source={source} /></> : <p className="community-text">{item.text || 'Рекомендую это мероприятие'}</p>}
      <Unpublish kind={kind} id={item.id} onDone={reload} />
    </article>)}
    <div className="community-actions"><button disabled={!offset} onClick={() => setOffset(value => Math.max(0, value - 20))}>Назад</button><span>{data.items.length ? offset + 1 : 0}–{data.items.length ? offset + data.items.length : 0} из {data.total}</span><button disabled={offset + data.items.length >= data.total} onClick={() => setOffset(value => value + 20)}>Далее</button></div>
  </section>;
}
function Author({ userId, source }) {
  const { request } = useCommunity();
  const load = useCallback(() => request(`/member-profiles/${userId}`), [request, userId]);
  const { data } = useResource(load);
  return <Link to={`/members/${userId}?source=${source}`}>{data?.name || `Участник №${userId}`}</Link>;
}
