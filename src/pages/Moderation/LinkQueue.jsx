import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../components/AuthContext.jsx';
import { useToast } from '../../components/Toast/ToastContext.jsx';

const API_BASE = 'https://ritmevents.ru/api/v1';
const PAGE_SIZE = 20;
const POLL_INTERVAL_MS = 30000;

const STATUS_FILTERS = [
  { key: 'all', label: 'Все' },
  { key: 'pending', label: 'В очереди' },
  { key: 'processing', label: 'В обработке' },
  { key: 'done', label: 'Готово' },
  { key: 'failed', label: 'Ошибка' },
];

const STATUS_LABELS = {
  pending: 'В очереди',
  processing: 'В обработке',
  done: 'Готово',
  failed: 'Ошибка',
};

function formatDate(iso) {
  return new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function LinkQueue() {
  const { token } = useAuth();
  const showToast = useToast();

  const [statusFilter, setStatusFilter] = useState('all');
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const query = statusFilter === 'all' ? '' : `&status=${statusFilter}`;
      const res = await fetch(`${API_BASE}/crawler/link-queue?limit=${PAGE_SIZE}&offset=0${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('network');
      const data = await res.json();
      setItems(Array.isArray(data.items) ? data.items : []);
      setTotal(data.total ?? 0);
    } catch {
      showToast('Не удалось загрузить очередь');
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter, showToast]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    const hasActive = items.some((item) => item.status === 'pending' || item.status === 'processing');
    if (!hasActive) return undefined;
    const interval = setInterval(fetchItems, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [items, fetchItems]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/crawler/link-queue`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });
      if (res.status === 422) {
        setSubmitError('Это не похоже на ссылку');
        return;
      }
      if (!res.ok) throw new Error('network');
      const created = await res.json();
      setUrl('');
      setItems((prev) => (prev.some((item) => item.id === created.id) ? prev : [created, ...prev]));
      setTotal((t) => t + (items.some((item) => item.id === created.id) ? 0 : 1));
    } catch {
      showToast('Не удалось добавить ссылку');
    } finally {
      setSubmitting(false);
    }
  }, [token, url, items, showToast]);

  return (
    <div className="link-queue">
      <form className="link-queue__form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="link-queue__input"
          placeholder="https://..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button type="submit" className="link-queue__submit" disabled={submitting || !url}>
          Добавить
        </button>
        {submitError && <p className="link-queue__error">{submitError}</p>}
      </form>

      <div className="link-queue__subtabs">
        {STATUS_FILTERS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            className={`moderation-tab ${statusFilter === key ? 'active' : ''}`}
            onClick={() => setStatusFilter(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="loading-container">
          <div className="spinner"></div>
        </div>
      )}

      {!loading && items.length === 0 && <p className="feedback-review__empty">Пока пусто</p>}

      {!loading && items.length > 0 && (
        <ul className="link-queue__list">
          {items.map((item) => (
            <li key={item.id} className="link-queue__item">
              <span className="link-queue__url">{item.url}</span>
              <span className={`link-queue__badge link-queue__badge--${item.status}`}>
                {STATUS_LABELS[item.status] ?? item.status}
              </span>
              {item.status === 'done' && (
                item.result_event_id ? (
                  <span className="link-queue__result">Событие #{item.result_event_id}</span>
                ) : (
                  <span className="link-queue__result">Анонс не найден</span>
                )
              )}
              {item.status === 'failed' && item.error_message && (
                <span className="link-queue__error-message">{item.error_message}</span>
              )}
              <span className="feedback-review__date">{formatDate(item.created_at)}</span>
            </li>
          ))}
        </ul>
      )}

      {!loading && items.length > 0 && (
        <p className="feedback-review__total">
          {items.length < total ? `Последние ${items.length} из ${total}` : `Всего: ${total}`}
        </p>
      )}
    </div>
  );
}
