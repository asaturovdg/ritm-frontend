import { useState, useEffect, useCallback, useRef } from 'react';
import { Placeholder } from '@telegram-apps/telegram-ui';
import { useAuth } from '../../components/AuthContext.jsx';
import { useToast } from '../../components/Toast/ToastContext.jsx';
import SubmissionQueueCard from './SubmissionQueueCard.jsx';
import QueueListSheet from './QueueListSheet.jsx';

const API_BASE = 'https://ritmevents.ru/api/v1';
const PAGE_SIZE = 20;

export default function SubmissionsQueue() {
  const { token, isAuthReady, setShowInputCode } = useAuth();
  const showToast = useToast();

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const currentIndexRef = useRef(0);
  currentIndexRef.current = currentIndex;

  const handleInvalidToken = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_id');
    setShowInputCode(true);
  }, [setShowInputCode]);

  const fetchPage = useCallback(async (pageOffset) => {
    const res = await fetch(`${API_BASE}/submissions/moderation-queue?limit=${PAGE_SIZE}&offset=${pageOffset}`, {
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
        const loadedItems = Array.isArray(data.items) ? data.items : [];
        setItems(loadedItems);
        setTotal(data.total);
        setOffset(loadedItems.length);
        setCurrentIndex(0);
        setLoadError(false);
      })
      .catch(() => {
        showToast('Не удалось загрузить очередь');
        setLoadError(true);
      })
      .finally(() => setLoading(false));
  }, [isAuthReady, token, fetchPage, showToast, retryKey]);

  const loadMore = useCallback(() => {
    if (loadingMore || items.length >= total) return;
    setLoadingMore(true);
    fetchPage(offset)
      .then((data) => {
        if (!data) return;
        const newItems = Array.isArray(data.items) ? data.items : [];
        if (newItems.length === 0) {
          setLoadError(true);
          return;
        }
        setItems((prev) => [...prev, ...newItems]);
        setOffset((prev) => prev + newItems.length);
      })
      .catch(() => {
        showToast('Не удалось загрузить очередь');
        setLoadError(true);
      })
      .finally(() => setLoadingMore(false));
  }, [fetchPage, offset, items.length, total, loadingMore, showToast]);

  useEffect(() => {
    if (loading || loadingMore || loadError) return;
    if (items.length < total && items.length - currentIndex <= 2) {
      loadMore();
    }
  }, [items.length, currentIndex, total, loading, loadingMore, loadError, loadMore]);

  const removeCurrentFromQueue = useCallback((submissionId) => {
    setItems((prev) => {
      const selectedId = prev[currentIndexRef.current]?.id;
      const next = prev.filter((item) => item.id !== submissionId);
      setTotal((t) => Math.max(0, t - 1));
      setCurrentIndex((idx) => {
        if (selectedId !== undefined && selectedId !== submissionId) {
          const selectedIdx = next.findIndex((item) => item.id === selectedId);
          if (selectedIdx >= 0) return selectedIdx;
        }
        return Math.min(idx, Math.max(0, next.length - 1));
      });
      return next;
    });
  }, []);

  const handleApprove = useCallback(async (submissionId) => {
    try {
      const res = await fetch(`${API_BASE}/submissions/${submissionId}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) return handleInvalidToken();
      if (!res.ok) throw new Error('network');
      removeCurrentFromQueue(submissionId);
    } catch {
      showToast('Не удалось сохранить. Попробуйте ещё раз');
    }
  }, [token, handleInvalidToken, removeCurrentFromQueue, showToast]);

  const handleReject = useCallback(async (submissionId, reason) => {
    try {
      const res = await fetch(`${API_BASE}/submissions/${submissionId}/reject`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: reason || undefined }),
      });
      if (res.status === 401) return handleInvalidToken();
      if (!res.ok) throw new Error('network');
      removeCurrentFromQueue(submissionId);
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
    if (loadError) {
      return (
        <div className="moderation">
          <Placeholder header="Не удалось загрузить" description="Попробуйте ещё раз">
            <button type="button" onClick={() => setRetryKey((k) => k + 1)}>
              Повторить
            </button>
          </Placeholder>
        </div>
      );
    }
    if (total > 0) {
      return (
        <div className="moderation">
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Загрузка очереди...</p>
          </div>
        </div>
      );
    }
    return (
      <div className="moderation">
        <Placeholder header="Очередь пуста" description="Все заявки проверены" />
      </div>
    );
  }

  const currentSubmission = items[currentIndex];

  return (
    <div className="moderation">
      <SubmissionQueueCard
        key={currentSubmission.id}
        submission={currentSubmission}
        index={currentIndex}
        total={total}
        onOpenList={() => setSheetOpen(true)}
        onApprove={handleApprove}
        onReject={handleReject}
      />
      {sheetOpen && (
        <QueueListSheet
          items={items}
          currentId={currentSubmission.id}
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
