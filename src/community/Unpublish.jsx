import { useRef, useState } from 'react';
import { useCommunity } from './context.js';
export default function Unpublish({ kind, id, onDone }) {
  const { isAdmin, request } = useCommunity();
  const [reason, setReason] = useState('');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  if (!isAdmin) return null;
  return <div className="community-admin"><button type="button" onClick={() => setOpen(value => !value)}>Снять публикацию (администратор)</button>{open && <form className="community-form" onSubmit={async e => {
    e.preventDefault(); if (lock.current || !reason.trim()) return;
    lock.current = true; setBusy(true); setError('');
    try { await request(`/member-content/${kind}/${id}/unpublish`, { method: 'POST', body: { reason: reason.trim() } }); onDone(); }
    catch (error) { if (error.name !== 'AbortError') setError(error.message); }
    finally { lock.current = false; setBusy(false); }
  }}><label>Причина снятия<textarea required maxLength={2000} value={reason} onChange={e => setReason(e.target.value)} /></label><button disabled={busy || !reason.trim()}>Подтвердить снятие</button>{error && <p role="alert">{error}</p>}</form>}</div>;
}
