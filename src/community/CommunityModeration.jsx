import { useCallback, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCommunity } from './context.js';
import { useResource } from './useResource.js';
import { KIND_LABELS } from './rules.js';
import Unpublish from './Unpublish.jsx';
import { Avatar, Pagination } from './CommunityUI.jsx';
import { describeContact } from './contact.js';
import { RefreshCw, ShieldCheck, ChevronDown } from 'lucide-react';
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
  return <section className="community"><div className="community-section-heading"><h2>Публикации участников</h2><button className="community-icon-button" aria-label="Обновить очередь" onClick={reload}><RefreshCw size={16} /></button></div><p className="community-hint">Ручная проверка профилей, рекомендаций и рассказов.</p>{notice && <p role="status">{notice}</p>}
    {loading ? <p role="status">Загрузка очереди…</p> : error ? <p role="alert">{error.message}</p> : <>
      <p className="community-review-date">Ожидают проверки: {data.total}</p>{!data.items.length && <p>Очередь пуста.</p>}
      {data.items.map(item => <RevisionCard key={`${item.kind}:${item.revision_id}:${item.generation}`} item={item} onDone={changed} />)}
      <Pagination offset={offset} total={data.total} count={data.items.length} onPage={setOffset} />
    </>}
    <AdminRemoval onDone={() => changed('Публикация снята.')} />
  </section>;
}
function RevisionCard({ item, onDone }) {
  const { request } = useCommunity();
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
  return <article className="community-card community-review-card">
    <div className="community-review-head"><span className="community-status">{KIND_LABELS[item.kind]}</span><span className="community-hint">На проверке</span></div>
    <p className="community-review-date">{new Date(item.submitted_at).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow' })} МСК</p>
    {item.event_id && <Link className="community-event-link" to={`/events/${item.event_id}`}>К мероприятию №{item.event_id}</Link>}
    {item.kind !== 'profile' && <ReviewAuthor userId={item.user_id} />}
    <Payload payload={item.payload} />
    <details className="community-review-details"><summary><span className="community-summary-label"><ShieldCheck size={15} aria-hidden="true" />Подсказка автопроверки</span><ChevronDown size={15} aria-hidden="true" /></summary><p className="community-hint">Решение остаётся за вами.</p><pre>{JSON.stringify(item.lexical_result, null, 2)}</pre></details>
    <Comparison item={item} />
    <label className="community-review-feedback">Причина возврата<textarea value={reason} maxLength={2000} placeholder="Что автору нужно исправить?" onChange={e => setReason(e.target.value)} /></label>
    <div className="community-save-actions"><button className="community-button--primary" disabled={busy} onClick={() => decide('approve')}>Одобрить</button><button className="community-button--secondary" disabled={busy || !reason.trim()} onClick={() => decide('request_changes')}>Вернуть на правку</button></div>
    <details className="community-review-details"><summary>Служебная информация<ChevronDown size={15} aria-hidden="true" /></summary><p className="community-hint">Автор: user_id {item.user_id}. Запись №{item.id}, версия №{item.revision_id}, generation {item.generation}.</p></details>
    <Unpublish kind={item.kind} id={item.id} onDone={() => onDone('Публикация снята.')} />
    {error && <p role="alert">{error}</p>}
  </article>;
}
function Payload({ payload }) {
  if (!payload) return null;
  return <div className="community-review-payload">
    {payload.name && <div className="community-identity"><Avatar name={payload.name} photoUrl={payload.photo_url} /><div><h3>{payload.name}</h3>{payload.position && <p>{payload.position}</p>}{payload.company && <p>{payload.company}</p>}</div></div>}
    {payload.about && <p className="community-text">{payload.about}</p>}
    {payload.interests && <div className="community-interest-chips">{payload.interests.split(',').map((interest, index) => interest.trim() && <span key={index}>{interest.trim()}</span>)}</div>}
    {payload.contact_url && <div className="community-contact-preview"><span><strong>{payload.contact_label || describeContact(payload.contact_url).action}</strong><small>{describeContact(payload.contact_url).display}</small></span></div>}
    {'text' in payload && <p className="community-text">{payload.text || 'Рекомендую это мероприятие'}</p>}
    {payload.participated !== undefined && <p className="community-hint">{payload.participated ? 'Автор сообщил об участии.' : 'Участие не подтверждено автором.'}</p>}
  </div>;
}

function ReviewAuthor({ userId }) {
  const { request } = useCommunity();
  const load = useCallback(() => request(`/member-profiles/${userId}`), [request, userId]);
  const { data } = useResource(load);
  const name = data?.name || `Участник №${userId}`;
  return <div className="community-author"><Avatar name={name} photoUrl={data?.photo_url} small /><span>{name}</span></div>;
}
function Comparison({ item }) {
  const [open, setOpen] = useState(false);
  return <div className="community-review-comparison"><button className="community-button--ghost" onClick={() => setOpen(v => !v)}>{open ? 'Скрыть сравнение' : 'Сравнить с опубликованным снимком'}</button>{open && <PublishedSnapshot item={item} />}</div>;
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
  return <details className="community-review-details"><summary>Снять опубликованную запись по её ID</summary><p>Используйте ID записи из очереди модерации. ID пользователя и ID версии сюда не подходят.</p><label>Тип записи<select value={kind} onChange={e => setKind(e.target.value)}>{Object.entries(KIND_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label>ID записи<input type="number" min="1" step="1" value={id} onChange={e => setId(e.target.value)} /></label>{/^[1-9]\d*$/.test(id) && <Unpublish key={`${kind}:${id}`} kind={kind} id={Number(id)} onDone={onDone} />}</details>;
}
