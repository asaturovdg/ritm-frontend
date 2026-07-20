import { useState, useEffect, useCallback } from 'react';
import { Placeholder } from '@telegram-apps/telegram-ui';
import { useAuth } from '../../components/AuthContext.jsx';
import { useToast } from '../../components/Toast/ToastContext.jsx';
import ModerationCard from './ModerationCard.jsx';
import QueueListSheet from './QueueListSheet.jsx';
import './Moderation.css';

const API_BASE = 'https://ritmevents.ru/api/v1';
const PAGE_SIZE = 20;

export default function Moderation() {
  const { token, isAuthReady, setShowInputCode } = useAuth();
  const showToast = useToast();

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const handleInvalidToken = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_id');
    setShowInputCode(true);
  }, [setShowInputCode]);

  const fetchPage = useCallback(async (pageOffset) => {
    const res = await fetch(`${API_BASE}/events/moderation-queue?limit=${PAGE_SIZE}&offset=${pageOffset}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) {
      handleInvalidToken();
      return null;
    }
    if (!res.ok) throw new Error('network');
    return res.json();
  }, [token, handleInvalidToken]);

  useEffect(() => {
    if (!isAuthReady || !token) return;
    setLoading(true);
    fetchPage(0)
      .then((data) => {
        if (!data) return;
        setItems(data.items);
        setTotal(data.total);
        setOffset(data.items.length);
        setCurrentIndex(0);
      })
      .catch(() => showToast('Не удалось загрузить очередь'))
      .finally(() => setLoading(false));
  }, [isAuthReady, token, fetchPage, showToast]);

  const loadMore = useCallback(() => {
    if (loadingMore || items.length >= total) return;
    setLoadingMore(true);
    fetchPage(offset)
      .then((data) => {
        if (!data) return;
        setItems((prev) => [...prev, ...data.items]);
        setOffset((prev) => prev + data.items.length);
      })
      .catch(() => showToast('Не удалось загрузить очередь'))
      .finally(() => setLoadingMore(false));
  }, [fetchPage, offset, items.length, total, loadingMore, showToast]);

  const removeCurrentFromQueue = useCallback((eventId) => {
    setItems((prev) => {
      const next = prev.filter((item) => item.id !== eventId);
      setTotal((t) => Math.max(0, t - 1));
      setCurrentIndex((idx) => Math.min(idx, Math.max(0, next.length - 1)));
      return next;
    });
  }, []);

  const handleReject = useCallback(async (eventId) => {
    try {
      const res = await fetch(`${API_BASE}/events/${eventId}/reject-suggestions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) return handleInvalidToken();
      if (!res.ok) throw new Error('network');
      removeCurrentFromQueue(eventId);
    } catch {
      showToast('Не удалось сохранить. Попробуйте ещё раз');
    }
  }, [token, handleInvalidToken, removeCurrentFromQueue, showToast]);

  const handleApprove = useCallback(async (eventId, payload) => {
    try {
      const res = await fetch(`${API_BASE}/events/${eventId}/approve-suggestions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ suggestions: payload }),
      });
      if (res.status === 401) return handleInvalidToken();
      if (!res.ok) throw new Error('network');
      removeCurrentFromQueue(eventId);
    } catch {
      showToast('Не удалось сохранить. Попробуйте ещё раз');
    }
  }, [token, handleInvalidToken, removeCurrentFromQueue, showToast]);

  if (loading) {
    return (
      <div className="moderation">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Загрузка очереди...</p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="moderation">
        <Placeholder header="Очередь пуста" description="Все события проверены" />
      </div>
    );
  }

  const currentEvent = items[currentIndex];

  return (
    <div className="moderation">
      <ModerationCard
        event={currentEvent}
        index={currentIndex}
        total={total}
        onOpenList={() => setSheetOpen(true)}
        onApprove={handleApprove}
        onReject={handleReject}
      />
      {sheetOpen && (
        <QueueListSheet
          items={items}
          currentId={currentEvent.id}
          hasMore={items.length < total}
          onSelect={(id) => {
            const idx = items.findIndex((item) => item.id === id);
            if (idx >= 0) setCurrentIndex(idx);
            setSheetOpen(false);
          }}
          onClose={() => setSheetOpen(false)}
          onLoadMore={loadMore}
        />
      )}
    </div>
  );
}
