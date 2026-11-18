import { useCallback, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../components/AuthContext.jsx';
import { useCommunity } from './context.js';
import { findOwnContent } from './api.js';
import { useResource } from './useResource.js';
import { profilePayload, STATE_LABELS } from './rules.js';

export default function ContentEditor(props) {
  const { enabled, request } = useCommunity();
  if (!enabled) return null;
  return <LoadedEditor {...props} request={request} />;
}
function LoadedEditor({ kind, eventId, request, canWrite = true, onChanged }) {
  const load = useCallback(async () => kind === 'profile'
    ? (await request('/member-profiles/me/manage')).items[0] || null
    : findOwnContent(request, kind, eventId), [request, kind, eventId]);
  const { data: owner, loading, error, reload } = useResource(load, { refreshOnFocus: false });
  const [message, setMessage] = useState('');
  if (loading) return <p role="status">Загрузка своей формы…</p>;
  if (error) return <div role="alert">{error.message} <button onClick={reload}>Повторить</button></div>;
  return <section className="community-card">
    <div className="community-actions"><h3>{kind === 'profile' ? 'Мой профиль участника' : kind === 'experience' ? 'Мой рассказ' : 'Моя рекомендация'}</h3><button onClick={reload}>Обновить статус</button></div>
    {owner && <><p><strong>{STATE_LABELS[owner.state] || 'Без отправленной версии'}</strong></p><p>{owner.visible ? 'Одобренная публикация доступна читателям.' : 'Публикация скрыта от читателей.'}</p>{owner.reason && <p role="note">Причина: {owner.reason}</p>}</>}
    {message && <p role="status">{message}</p>}
    <EditorForm key={`${owner?.generation}:${owner?.revision_id}`} kind={kind} eventId={eventId} owner={owner} canWrite={canWrite} request={request} onDone={(message) => { setMessage(message); reload(); onChanged?.(); }} />
  </section>;
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
  const editingAllowed = canWrite || (kind === 'recommendation' && owner?.visible);
  const pending = ['checking', 'pending'].includes(owner?.state);
  const path = kind === 'profile' ? '/member-profiles/me' : `/events/${eventId}/${kind}`;
  const change = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
  const act = async (action) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      if (action === 'save') await request(kind === 'profile' ? `${path}/draft` : path, { method: 'PUT', body });
      else if (action === 'submit') await request(`${path}/submit`, { method: 'POST', body: { generation: owner.generation } });
      else await request(kind === 'profile' ? `${path}/${action}` : path, { method: 'DELETE' });
      onDone(action === 'save' ? 'Черновик сохранён. Для публикации отправьте его на проверку.' : action === 'submit' ? 'Версия принята на проверку.' : 'Публикация обновлена.');
    } catch (e) {
      if (e.status === 409) onDone(`Состояние изменилось: ${e.message}`);
      else if (e.name !== 'AbortError') setError(e.message);
    } finally { lock.current = false; setBusy(false); }
  };
  const field = (name, label, maxLength, multiline = false, required = false) => <label key={name}>{label}{multiline ? <textarea value={form[name] || ''} maxLength={maxLength} required={required} onChange={e => change(name, e.target.value)} /> : <input type={name === 'contact_url' ? 'url' : 'text'} value={form[name] || ''} maxLength={maxLength} required={required} pattern={name === 'contact_url' ? 'https://.*' : undefined} onChange={e => change(name, e.target.value)} />}</label>;
  return <form className="community-form" onSubmit={e => { e.preventDefault(); act('save'); }}>
    <fieldset disabled={busy || !editingAllowed}>
      {kind === 'profile' ? <>
        {owner?.payload?.photo_url && <div><p>Фото сохранённого снимка</p><img className="community-avatar" src={owner.payload.photo_url} alt="Фото сохранённого профиля" referrerPolicy="no-referrer" /></div>}
        {field('name', 'Имя', 128, false, true)}{field('about', 'О себе', 2000, true)}{field('company', 'Компания', 256)}{field('position', 'Должность', 256)}{field('interests', 'Интересы', 512, true)}
        <label>Фото следующего черновика<select value={form.photo_provider || ''} onChange={e => change('photo_provider', e.target.value || null)}><option value="">Без фото при следующем сохранении</option>{userData?.telegram_id && <option value="telegram">Из связанного Telegram</option>}</select></label>
        <p className="community-hint">Выберите фото заново перед сохранением. «Без фото» удалит его из нового снимка. Сейчас доступно фото из связанного Telegram. Фото других аккаунтов пока недоступны.</p>
        {field('contact_url', 'Контакт (HTTPS-ссылка)', 2048)}{field('contact_label', 'Подпись контакта', 80)}
        <p>После одобрения контакт доступен всем авторизованным участникам, даже если вы не ищете компанию. Контакт из аккаунта не переносится автоматически.</p>
        {!!form.contact_url && <label className="community-check"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />Я согласен опубликовать этот контакт для всех авторизованных участников.</label>}
      </> : <>
        {field('text', kind === 'experience' ? 'Текст рассказа' : 'Текст рекомендации', kind === 'experience' ? 10000 : 2000, true, kind === 'experience')}
        {kind === 'experience' && <><label className="community-check"><input type="checkbox" required checked={form.participated} onChange={e => change('participated', e.target.checked)} />Я участвовал</label><p className="community-hint">Это ваше заявление. Сервис не подтверждает посещение.</p></>}
      </>}
      <div className="community-actions">
        <button type="submit" disabled={kind === 'experience' && !form.participated}>Сохранить черновик</button>
        <button type="button" disabled={!owner?.revision_id || dirty || pending || (kind === 'profile' && !!form.contact_url && !consent)} onClick={() => act('submit')}>Отправить на проверку</button>
      </div>
    </fieldset>
    {!editingAllowed && <p>Сейчас создание этой записи недоступно. Нужны опубликованный <Link to="/members/me/edit">профиль</Link> и подходящее время мероприятия.</p>}
    {owner && <div className="community-actions">
      <button type="button" disabled={busy} onClick={() => act(kind === 'profile' ? 'visibility' : 'hide')}>{kind === 'profile' ? 'Скрыть профиль' : kind === 'experience' ? 'Убрать рассказ' : 'Убрать рекомендацию'}</button>
      {kind === 'profile' && <button type="button" disabled={busy} onClick={() => act('contact')}>Отозвать контакт</button>}
    </div>}
    {error && <p role="alert">{error}</p>}
  </form>;
}
