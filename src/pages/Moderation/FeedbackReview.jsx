import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../components/AuthContext.jsx';
import { useToast } from '../../components/Toast/ToastContext.jsx';

const API_BASE = 'https://ritmevents.ru/api/v1';
const PAGE_SIZE = 20;

const CATEGORY_LABELS = { bug: 'Баг', idea: 'Идея', other: 'Другое' };

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function FeedbackReview() {
  const { token } = useAuth();
  const showToast = useToast();
  const [subTab, setSubTab] = useState('scores'); // 'scores' | 'reports'
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const endpoint = subTab === 'scores' ? 'pulse-check' : 'report';

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/feedback/${endpoint}?limit=${PAGE_SIZE}&offset=0`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('network');
      const data = await res.json();
      setItems(Array.isArray(data.items) ? data.items : []);
      setTotal(data.total ?? 0);
    } catch {
      showToast('Не удалось загрузить обратную связь');
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [token, endpoint, showToast]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return (
    <div className="feedback-review">
      <div className="feedback-review__subtabs">
        <button
          type="button"
          className={`moderation-tab ${subTab === 'scores' ? 'active' : ''}`}
          onClick={() => setSubTab('scores')}
        >
          Оценки
        </button>
        <button
          type="button"
          className={`moderation-tab ${subTab === 'reports' ? 'active' : ''}`}
          onClick={() => setSubTab('reports')}
        >
          Обращения
        </button>
      </div>

      {loading && (
        <div className="loading-container">
          <div className="spinner"></div>
        </div>
      )}

      {!loading && items.length === 0 && <p className="feedback-review__empty">Пока пусто</p>}

      {!loading && items.length > 0 && (
        <ul className="feedback-review__list">
          {items.map((item) => (
            <li key={item.id} className="feedback-review__item">
              {subTab === 'scores' ? (
                <>
                  <span className="feedback-review__score">{'⭐'.repeat(item.score)}</span>
                  {item.comment && <p className="feedback-review__text">{item.comment}</p>}
                </>
              ) : (
                <>
                  <span className="feedback-review__category">
                    {CATEGORY_LABELS[item.category] ?? item.category}
                  </span>
                  <p className="feedback-review__text">{item.message}</p>
                </>
              )}
              <span className="feedback-review__date">{formatDate(item.created_at)}</span>
            </li>
          ))}
        </ul>
      )}

      {!loading && items.length > 0 && items.length < total && (
        <p className="feedback-review__total">Показано {items.length} из {total}</p>
      )}
    </div>
  );
}
