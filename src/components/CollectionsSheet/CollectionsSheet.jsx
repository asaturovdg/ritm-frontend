import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../AuthContext.jsx';
import { useCollections } from '../CollectionsContext.jsx';
import { useToast } from '../Toast/ToastContext.jsx';
import ColorSwatchPicker from '../ColorSwatchPicker/ColorSwatchPicker.jsx';
import './CollectionsSheet.css';

export default function CollectionsSheet({ event, source = 'list', onClose }) {
  const { token } = useAuth();
  const { collections, colors, create, load, bumpEventCount } = useCollections();
  const showToast = useToast();

  const eventId = event?.id;
  const [selected, setSelected] = useState(new Set());
  const initialSelectedRef = useRef(new Set());
  const [loadingMembership, setLoadingMembership] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('');
  const [creatingBusy, setCreatingBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingMembership(true);
    fetch(`https://ritmevents.ru/api/v1/events/${eventId}/collections`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();
        const ids = new Set(data?.collection_ids ?? []);
        if (!cancelled) {
          setSelected(ids);
          initialSelectedRef.current = ids;
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingMembership(false);
      });
    return () => { cancelled = true; };
  }, [eventId, token]);

  const toggle = (id) => {
    setSelected(prev => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setCreatingBusy(true);
    try {
      const collection = await create(name, newColor || undefined);
      setSelected(prev => new Set([...prev, collection.id]));
      setCreating(false);
      setNewName('');
    } catch {
      showToast('Не удалось создать подборку');
    } finally {
      setCreatingBusy(false);
    }
  };

  const handleDone = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`https://ritmevents.ru/api/v1/events/${eventId}/collections`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ collection_ids: Array.from(selected), source }),
      });
      if (res.ok) {
        const before = initialSelectedRef.current;
        selected.forEach((id) => { if (!before.has(id)) bumpEventCount(id, 1); });
        before.forEach((id) => { if (!selected.has(id)) bumpEventCount(id, -1); });
        onClose();
        return;
      }
      showToast('Не удалось сохранить, попробуйте ещё раз');
      load();
    } catch {
      showToast('Не удалось сохранить, попробуйте ещё раз');
      load();
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="collections-sheet"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div
        className="collections-sheet__backdrop"
        data-testid="collections-sheet-backdrop"
        onClick={onClose}
      />
      <div className="collections-sheet__panel">
        <div className="collections-sheet__title">Сохранить в подборку</div>

        {loadingMembership ? (
          <div className="collections-sheet__loading">Загрузка…</div>
        ) : collections.length === 0 && !creating ? (
          <div className="collections-sheet__empty">У вас пока нет подборок</div>
        ) : (
          <div className="collections-sheet__list">
            {collections.map((c) => (
              <label key={c.id} className="collections-sheet__item">
                <input
                  type="checkbox"
                  checked={selected.has(c.id)}
                  onChange={() => toggle(c.id)}
                />
                <span className="collections-sheet__item-name" style={{ color: c.color ?? colors[0] }}>{c.name}</span>
                <span className="collections-sheet__item-count">{c.event_count}</span>
              </label>
            ))}
          </div>
        )}

        {creating ? (
          <div className="collections-sheet__create">
            <ColorSwatchPicker colors={colors} value={newColor} onChange={setNewColor} />
            <div className="collections-sheet__create-row">
              <input
                type="text"
                className="collections-sheet__create-input"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Название подборки"
                maxLength={100}
                autoFocus
              />
              <button
                className="collections-sheet__create-btn"
                onClick={handleCreate}
                disabled={creatingBusy || !newName.trim()}
              >
                Создать
              </button>
            </div>
          </div>
        ) : (
          <button className="collections-sheet__add" onClick={() => { setCreating(true); setNewColor(colors[0] ?? ''); }}>
            + Новая подборка
          </button>
        )}

        <button
          className="collections-sheet__done"
          onClick={handleDone}
          disabled={submitting || loadingMembership}
        >
          Готово
        </button>
      </div>
    </div>,
    document.body
  );
}
