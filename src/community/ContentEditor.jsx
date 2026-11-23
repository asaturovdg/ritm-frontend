import { useCallback, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown, RefreshCw } from 'lucide-react';
import { useAuth } from '../components/AuthContext.jsx';
import { useCommunity } from './context.js';
import { findOwnContent } from './api.js';
import { useResource } from './useResource.js';
import { profilePayload, httpsContact } from './rules.js';
import { Avatar, StatusBadge } from './CommunityUI.jsx';
import ContactField from './ContactField.jsx';
import { normalizeContact } from './contact.js';

export default function ContentEditor(props) {
  const { enabled, request } = useCommunity();
  if (!enabled) return null;
  return <LoadedEditor {...props} request={request} />;
}
function LoadedEditor({ kind, eventId, request, canWrite = true, onChanged, collapsible = false }) {
  const load = useCallback(async () => kind === 'profile'
    ? (await request('/member-profiles/me/manage')).items[0] || null
    : findOwnContent(request, kind, eventId), [request, kind, eventId]);
  const { data: owner, loading, error, reload } = useResource(load, { refreshOnFocus: false });
  const [message, setMessage] = useState('');
  const title = kind === 'experience' ? 'Мой рассказ' : 'Моя рекомендация';
  if (loading) return <p className="community-loading" role="status">Загрузка своей формы…</p>;
  if (error) return <div className="community-notice" role="alert">{kind === 'profile' && error.status === 404 ? 'Профили участников пока недоступны. Попробуйте позже.' : error.message} <button className="community-button--ghost" onClick={reload}>Повторить</button></div>;
  const content = <>
    <div className="community-editor-status">
      <StatusBadge state={owner?.state || 'draft'} />
      <span className="community-hint">{owner?.visible ? 'Одобренная версия видна участникам' : 'Пока виден только вам'}</span>
      <button type="button" className="community-icon-button" aria-label="Обновить статус" onClick={reload}><RefreshCw size={15} /></button>
    </div>
    {owner?.reason && <p className="community-notice" role="note">Причина: {owner.reason}</p>}
    {message && <p className="community-notice" role="status">{message}</p>}
    <EditorForm key={`${owner?.generation}:${owner?.revision_id}`} kind={kind} eventId={eventId} owner={owner} canWrite={canWrite} request={request} onDone={text => { setMessage(text); reload(); onChanged?.(); }} />
  </>;
  if (collapsible) return <details className="community-card community-editor-disclosure" open={Boolean(owner)}><summary>{title}<ChevronDown size={16} aria-hidden="true" /></summary>{content}</details>;
  return <section className={kind === 'profile' ? 'community-editor' : 'community-card'}>{kind !== 'profile' && <h3>{title}</h3>}{content}</section>;
}
function EditorForm({ kind, eventId, owner, canWrite, request, onDone }) {
  const { userData } = useAuth();
  const initial = kind === 'profile' ? profilePayload({ ...owner?.payload, photo_provider: null }) : { text: owner?.payload?.text || '', ...(kind === 'experience' ? { participated: owner?.payload?.participated === true } : {}) };
  const [form, setForm] = useState(initial);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const body = kind === 'profile' ? profilePayload(form) : kind === 'experience' ? { text: form.text.trim(), participated: form.participated } : { text: form.text.trim() || null };
  const baseline = kind === 'recommendation' ? { text: initial.text.trim() || null } : initial;
  const dirty = JSON.stringify(body) !== JSON.stringify(baseline);
  const invalidContact = kind === 'profile' && Boolean(form.contact_url) && (!httpsContact(form.contact_url) || Boolean(normalizeContact('web', form.contact_url).error));
  const editingAllowed = canWrite || (kind === 'recommendation' && owner?.visible);
  const pending = ['checking', 'pending'].includes(owner?.state);
  const path = kind === 'profile' ? '/member-profiles/me' : `/events/${eventId}/${kind}`;
  const change = (field, value) => setForm(previous => ({ ...previous, [field]: value }));
  const act = async action => {
    if (lock.current || (invalidContact && ['save', 'submit'].includes(action))) return;
    lock.current = true; setBusy(true); setError('');
    try {
      if (action === 'save') await request(kind === 'profile' ? `${path}/draft` : path, { method: 'PUT', body });
      else if (action === 'submit') await request(`${path}/submit`, { method: 'POST', body: { generation: owner.generation } });
      else await request(kind === 'profile' ? `${path}/${action}` : path, { method: 'DELETE' });
      onDone(action === 'save' ? 'Черновик сохранён. Для публикации отправьте его на проверку.' : action === 'submit' ? 'Версия принята на проверку.' : 'Публикация обновлена.');
    } catch (failure) {
      if (failure.status === 409) onDone(`Состояние изменилось: ${failure.message}`);
      else if (failure.name !== 'AbortError') setError(failure.message);
    } finally { lock.current = false; setBusy(false); }
  };
  const field = (name, label, maxLength, multiline = false, required = false) => <label className="community-field" key={name}><span>{label}</span>{multiline ? <textarea value={form[name] || ''} maxLength={maxLength} required={required} onChange={e => change(name, e.target.value)} /> : <input value={form[name] || ''} maxLength={maxLength} required={required} onChange={e => change(name, e.target.value)} />}</label>;
  return <form className="community-form" onSubmit={e => { e.preventDefault(); act('save'); }}>
    <fieldset disabled={busy || !editingAllowed}>
      {kind === 'profile' ? <>
        <section className="community-card community-form-group">
          <h2>О вас</h2>
          <div className="community-photo-choice"><Avatar name={form.name || ''} photoUrl={owner?.payload?.photo_url} /><label>Фото профиля<select value={form.photo_provider || ''} onChange={e => change('photo_provider', e.target.value || null)}><option value="">Без фото</option>{userData?.telegram_id && <option value="telegram">Из связанного Telegram</option>}</select></label></div>
          <p className="community-hint">Выберите фото перед сохранением. Иначе новый снимок будет без фото.</p>
          {field('name', 'Имя', 128, false, true)}{field('position', 'Должность', 256)}{field('company', 'Компания', 256)}{field('about', 'О себе', 2000, true)}
        </section>
        <details className="community-form-section"><summary>Интересы<ChevronDown size={16} aria-hidden="true" /></summary>{field('interests', 'Темы, которые вам интересны', 512, true)}</details>
        <details className="community-form-section" open>
          <summary>Как с вами связаться<ChevronDown size={16} aria-hidden="true" /></summary>
          <ContactField value={form.contact_url} label={form.contact_label} onChange={value => { change('contact_url', value); setConsent(false); }} onLabelChange={value => change('contact_label', value)} />
          {!!form.contact_url && <label className="community-check"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />Я согласен опубликовать этот контакт для всех авторизованных участников, даже если не ищу компанию.</label>}
        </details>
      </> : <>
        {field('text', kind === 'experience' ? 'Текст рассказа' : 'Текст рекомендации', kind === 'experience' ? 10000 : 2000, true, kind === 'experience')}
        {kind === 'experience' && <><label className="community-check"><input type="checkbox" required checked={form.participated} onChange={e => change('participated', e.target.checked)} />Я участвовал</label><p className="community-hint">Это ваше заявление. Сервис не подтверждает посещение.</p></>}
      </>}
      <div className="community-save-actions">
        <button type="submit" className="community-button--secondary" aria-label="Сохранить черновик" disabled={invalidContact || (kind === 'experience' && !form.participated)}>Сохранить</button>
        <button type="button" className="community-button--primary" aria-label="Отправить на проверку" disabled={invalidContact || !owner?.revision_id || dirty || pending || (kind === 'profile' && !!form.contact_url && !consent)} onClick={() => act('submit')}>На проверку<ArrowRight size={16} aria-hidden="true" /></button>
      </div>
    </fieldset>
    {!editingAllowed && <p className="community-hint">Сейчас создание этой записи недоступно. Нужны опубликованный <Link to="/members/me/edit">профиль</Link> и подходящее время мероприятия.</p>}
    {owner && <details className="community-form-section community-privacy"><summary>Управление видимостью<ChevronDown size={16} aria-hidden="true" /></summary><div className="community-actions">
      <button type="button" className="community-button--danger" disabled={busy} onClick={() => act(kind === 'profile' ? 'visibility' : 'hide')}>{kind === 'profile' ? 'Скрыть профиль' : kind === 'experience' ? 'Убрать рассказ' : 'Убрать рекомендацию'}</button>
      {kind === 'profile' && <button type="button" className="community-button--danger" disabled={busy} onClick={() => act('contact')}>Отозвать контакт</button>}
    </div></details>}
    {error && <p role="alert">{error}</p>}
  </form>;
}
