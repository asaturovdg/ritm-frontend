import { useCallback, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCommunity } from './context.js';
import { useResource } from './useResource.js';
import { KIND_LABELS } from './rules.js';
import Unpublish from './Unpublish.jsx';
import './Community.css';

export default function CommunityModeration() {
  const { enabled, isAdmin } = useCommunity();
  if (!enabled) return <p>Сообщество пока недоступно для вашего аккаунта.</p>;
  if (!isAdmin) return <p>Нужны права администратора.</p>;
  return <Queue />;
}
function Queue() {
  const { request } = useCommunity();
  const [offset, setOffset] = useState(0);
  const [notice, setNotice] = useState('');
  const load = useCallback(() => request(`/member-content/moderation-queue?limit=20&offset=${offset}`), [request, offset]);
  const { data, loading, error, reload } = useResource(load, { refreshOnFocus: false });
  const changed = message => { setNotice(message); if (offset) setOffset(0); else reload(); };
  return <section className="community"><h2>Публикации участников</h2><p>Проверяйте вручную. Результат автопроверки — только подсказка.</p>
    <button onClick={reload}>Обновить очередь</button>{notice && <p role="status">{notice}</p>}
    {loading ? <p role="status">Загрузка очереди…</p> : error ? <p role="alert">{error.message}</p> : <>
      <p>Ожидают проверки: {data.total}</p>{!data.items.length && <p>Очередь пуста.</p>}
      {data.items.map(item => <RevisionCard key={`${item.kind}:${item.revision_id}:${item.generation}`} item={item} onDone={changed} />)}
      <div className="community-actions"><button disabled={!offset} onClick={() => setOffset(v => Math.max(0, v - 20))}>Назад</button><button disabled={offset + data.items.length >= data.total} onClick={() => setOffset(v => v + 20)}>Далее</button></div>
    </>}
    <AdminRemoval onDone={() => changed('Публикация снята.')} />
  </section>;
}
function RevisionCard({ item, onDone }) {
  const { request, userId } = useCommunity();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const decide = async decision => {
    if (lock.current || (decision === 'request_changes' && !reason.trim())) return;
    lock.current = true; setBusy(true); setError('');
    try {
      await request(`/member-content/revisions/${item.revision_id}/decision`, { method: 'POST', body: { generation: item.generation, decision, reason: reason.trim() || null } });
      onDone(decision === 'approve' ? 'Публикация одобрена.' : 'Версия возвращена автору.');
    } catch (e) { if (e.status === 409) onDone('Версия изменилась. Очередь обновлена; решение не повторялось.'); else if (e.name !== 'AbortError') setError(e.message); }
    finally { lock.current = false; setBusy(false); }
  };
  return <article className="community-card"><h3>{KIND_LABELS[item.kind]} · запись №{item.id}</h3>
    <p>Автор: user_id {item.user_id}. Версия №{item.revision_id}, generation {item.generation}</p>
    <p>Отправлена: {new Date(item.submitted_at).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })} МСК</p>
    {item.event_id && <Link to={`/events/${item.event_id}`}>Событие №{item.event_id}</Link>}
    <h4>Отправленная версия</h4><Payload payload={item.payload} />
    <details><summary>Подсказка автопроверки</summary><pre className="community-text">{JSON.stringify(item.lexical_result, null, 2)}</pre></details>
    <Comparison item={item} />
    <label className="community-form">Причина возврата<textarea value={reason} maxLength={2000} onChange={e => setReason(e.target.value)} /></label>
    {Number(userId) === Number(item.user_id) && <p>Собственную запись проверять нельзя.</p>}
    <div className="community-actions"><button disabled={busy || Number(userId) === Number(item.user_id)} onClick={() => decide('approve')}>Одобрить</button><button disabled={busy || !reason.trim() || Number(userId) === Number(item.user_id)} onClick={() => decide('request_changes')}>Вернуть на правку</button></div>
    <Unpublish kind={item.kind} id={item.id} onDone={() => onDone('Публикация снята.')} />
    {error && <p role="alert">{error}</p>}
  </article>;
}
function Payload({ payload }) {
  const labels = { name: 'Имя', about: 'О себе', company: 'Компания', position: 'Должность', interests: 'Интересы', contact_url: 'Контакт', contact_label: 'Подпись контакта', text: 'Текст', participated: 'Заявление об участии' };
  return <dl>{Object.entries(labels).filter(([key]) => payload?.[key] !== undefined && payload[key] !== null).map(([key, label]) => <div key={key}><dt>{label}</dt><dd className="community-text">{typeof payload[key] === 'boolean' ? (payload[key] ? 'Да' : 'Нет') : payload[key]}</dd></div>)}{payload?.photo_url && <div><dt>Фото</dt><dd><img className="community-avatar" src={payload.photo_url} alt="Фото проверяемой версии" referrerPolicy="no-referrer" /></dd></div>}</dl>;
}
function Comparison({ item }) {
  const [open, setOpen] = useState(false);
  return <div><button onClick={() => setOpen(v => !v)}>{open ? 'Скрыть сравнение' : 'Сравнить с опубликованным снимком'}</button>{open && <PublishedSnapshot item={item} />}</div>;
}
function PublishedSnapshot({ item }) {
  const { request } = useCommunity();
  const load = useCallback(async () => {
    if (item.kind === 'profile') {
      try { return await request(`/member-profiles/${item.user_id}`); } catch (e) { if (e.status === 404) return null; throw e; }
    }
    const collection = item.kind === 'experience' ? 'experiences' : 'recommendations';
    let offset = 0;
    while (true) {
      const page = await request(`/events/${item.event_id}/${collection}?limit=100&offset=${offset}`);
      const found = page.items.find(row => row.id === item.id);
      if (found) return found;
      offset += page.items.length;
      if (offset >= page.total) return null;
      if (!page.items.length) throw new Error('Не удалось загрузить опубликованный снимок.');
    }
  }, [request, item.kind, item.user_id, item.event_id, item.id]);
  const { data, loading, error } = useResource(load, { refreshOnFocus: false });
  return loading ? <p>Загрузка опубликованного снимка…</p> : error ? <p role="alert">{error.message}</p> : data ? <div><h4>Опубликованный снимок</h4><Payload payload={data} /></div> : <p>Опубликованного снимка нет.</p>;
}
function AdminRemoval({ onDone }) {
  const [kind, setKind] = useState('profile');
  const [id, setId] = useState('');
  return <details><summary>Снять опубликованную запись по её ID</summary><p>Используйте ID записи из очереди модерации. ID пользователя и ID версии сюда не подходят.</p><label>Тип записи<select value={kind} onChange={e => setKind(e.target.value)}>{Object.entries(KIND_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label>ID записи<input type="number" min="1" step="1" value={id} onChange={e => setId(e.target.value)} /></label>{/^[1-9]\d*$/.test(id) && <Unpublish key={`${kind}:${id}`} kind={kind} id={Number(id)} onDone={onDone} />}</details>;
}
