import { useState, useEffect, useRef } from 'react';
import { Placeholder } from '@telegram-apps/telegram-ui';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, MapPin, RussianRuble, Hand, MoreVertical } from 'lucide-react';
import { useAuth } from '../../components/AuthContext.jsx';
import { useCollections } from '../../components/CollectionsContext.jsx';
import './Featured.css';

const formatDate = (d) => d ? d.split('-').reverse().join('.') : '';
const formatTime = (t) => t ? t.substring(0, 5) : '';

const VARIANT_ICON_COLOR = {
  default: '#1032A1',
  sber: '#0A8043',
  foryou: '#8A3FFC',
  halfyear: '#C2410C',
};

const getIconColor = (variant) => VARIANT_ICON_COLOR[variant] || VARIANT_ICON_COLOR.default;

const SWIPE_HINT_STORAGE_KEY = 'featured_swipe_hint_last_shown_at';
const SWIPE_HINT_REAPPEAR_MS = 7 * 24 * 60 * 60 * 1000; // раз в 7 дней, даже если уже свайпал

const shouldShowHint = () => {
  try {
    const lastShown = Number(window.localStorage.getItem(SWIPE_HINT_STORAGE_KEY));
    return !lastShown || Date.now() - lastShown > SWIPE_HINT_REAPPEAR_MS;
  } catch {
    return false;
  }
};

const recordHintShown = () => {
  try {
    window.localStorage.setItem(SWIPE_HINT_STORAGE_KEY, String(Date.now()));
  } catch {
    /* storage unavailable (e.g. restricted webview) — hint may reappear next visit */
  }
};

function FeaturedCard({ event, onClick, variant = 'default' }) {
  const iconColor = getIconColor(variant);
  return (
    <button className={`featured-card featured-card--${variant}`} onClick={onClick}>
      <div className="featured-card__header">
        <div className="featured-card__type">
          {event.event_type?.join(', ')}
        </div>
        <div className="featured-card__title">{event.title}</div>
      </div>
      <div className="featured-card__body">
        {event.start_date && (
          <div className="featured-card__meta-row">
            <Calendar size={12} color={iconColor} strokeWidth={1.5} />
            {formatDate(event.start_date)}
            {event.start_time && (
              <>
                <Clock size={12} color={iconColor} strokeWidth={1.5} />
                {formatTime(event.start_time)}
              </>
            )}
          </div>
        )}
        {event.city?.length > 0 && (
          <div className="featured-card__meta-row">
            <MapPin size={12} color={iconColor} strokeWidth={1.5} />
            {event.city.join(', ')}
          </div>
        )}
        {typeof event.price === 'number' && (
          <div className="featured-card__meta-row">
            <RussianRuble size={12} color={iconColor} strokeWidth={1.5} />
            {event.price === 0 ? 'Бесплатно' : event.price}
          </div>
        )}
        {event.track?.length > 0 && (
          <div className="featured-card__tracks">
            {event.track.map((t, i) => (
              <span key={i} className="featured-card__track">{t}</span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}

function FeaturedCarousel({ title, items, onCardClick, variant = 'default', showHint = false, headerExtra = null }) {
  const iconColor = getIconColor(variant);
  const carouselRef = useRef(null);
  const rafRef = useRef(null);
  const scrollEndTimerRef = useRef(null);
  const hintVisibleRef = useRef(false);
  const [hintVisible, setHintVisible] = useState(false);

  const dismissHint = () => {
    hintVisibleRef.current = false;
    setHintVisible(false);
  };

  useEffect(() => {
    if (!showHint) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return;
    if (!shouldShowHint()) return;

    hintVisibleRef.current = true;
    setHintVisible(true);
    recordHintShown();
  }, [showHint]);

  useEffect(() => {
    hintVisibleRef.current = hintVisible;
  }, [hintVisible]);

  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;

    const wrapEl = el.parentElement;

    const updateEdgeFade = () => {
      const atEnd = el.scrollWidth - el.clientWidth - el.scrollLeft < 4;
      wrapEl?.classList.toggle('featured-carousel-wrap--end', atEnd);
    };

    const applyScale = (withTransition) => {
      const cards = el.querySelectorAll('.featured-card');
      const centerX = el.scrollLeft + el.offsetWidth / 2;

      cards.forEach((card) => {
        const cardMidX = card.offsetLeft + card.offsetWidth / 2;
        const dist = Math.abs(cardMidX - centerX);
        const progress = Math.max(0, Math.min(1, 1 - dist / (card.offsetWidth * 1.5)));
        const scale = 0.92 + 0.08 * progress;
        const opacity = 0.8 + 0.2 * progress;

        card.style.transition = withTransition
          ? 'transform 0.2s ease, opacity 0.2s ease'
          : 'none';
        card.style.transform = `scale(${scale})`;
        card.style.opacity = opacity;
      });

      updateEdgeFade();
    };

    applyScale(false);

    const onScroll = () => {
      if (hintVisibleRef.current) dismissHint();

      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => applyScale(false));

      clearTimeout(scrollEndTimerRef.current);
      scrollEndTimerRef.current = setTimeout(() => applyScale(true), 150);
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      clearTimeout(scrollEndTimerRef.current);
    };
  }, [items]);

  if (!items || items.length === 0) return null;

  return (
    <div className="featured-section">
      <div className="featured-section__header">
        <span className="featured-section__title">{title}</span>
        <span
          className="featured-section__count"
          style={{ color: iconColor, borderColor: iconColor }}
        >
          {items.length}
        </span>
        {headerExtra}
      </div>
      <div className="featured-carousel-wrap">
        <div className="featured-carousel" ref={carouselRef}>
          {items.map(event => (
            <FeaturedCard key={event.id} event={event} onClick={() => onCardClick(event.id)} variant={variant} />
          ))}
        </div>
        <div className="featured-carousel__fade" aria-hidden="true" />
        {hintVisible && (
          <div className="featured-swipe-hint" aria-hidden="true">
            <div className="featured-swipe-hint__badge">
              {/* Circle drawn as its own SVG shape rather than a CSS
                  border-radius background — see project history: on some
                  Android WebViews (Telegram/Max mini-app) border-radius on
                  an animated layer fails to clip and renders as a square.
                  An SVG circle rasterizes as its own bitmap and isn't
                  subject to that bug. */}
              <svg className="featured-swipe-hint__badge-circle" width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
                <circle cx="17" cy="17" r="16.25" fill="#fff" stroke={getIconColor(variant)} strokeOpacity="0.18" strokeWidth="1.5" />
              </svg>
              <Hand size={22} color={getIconColor(variant)} fill="#fff" strokeWidth={2} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CollectionMenu({ open, onToggle, onClose, onRename, onDelete }) {
  return (
    <div className="collection-menu">
      <button
        type="button"
        className="collection-menu__trigger"
        aria-label="Действия с подборкой"
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
      >
        <MoreVertical size={16} strokeWidth={1.75} />
      </button>
      {open && (
        <>
          <div className="collection-menu__backdrop" onClick={onClose} />
          <div className="collection-menu__dropdown">
            <button type="button" className="collection-menu__item" onClick={() => { onClose(); onRename(); }}>
              Переименовать
            </button>
            <button type="button" className="collection-menu__item collection-menu__item--danger" onClick={() => { onClose(); onDelete(); }}>
              Удалить
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function MyCollectionSection({ collection, token, onCardClick, isMenuOpen, onToggleMenu, onCloseMenu, onRename, onDelete }) {
  const [events, setEvents] = useState(null);
  const [loadingEvents, setLoadingEvents] = useState(false);

  useEffect(() => {
    if (!collection.event_count) {
      setEvents([]);
      return;
    }
    let cancelled = false;
    setLoadingEvents(true);
    fetch(`https://ritmevents.ru/api/v1/collections/${collection.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setEvents(Array.isArray(data?.events) ? data.events : []);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingEvents(false); });
    return () => { cancelled = true; };
  }, [collection.id, collection.event_count, token]);

  const menu = (
    <CollectionMenu
      open={isMenuOpen}
      onToggle={onToggleMenu}
      onClose={onCloseMenu}
      onRename={onRename}
      onDelete={onDelete}
    />
  );

  if (!collection.event_count) {
    return (
      <div className="featured-section">
        <div className="featured-section__header">
          <span className="featured-section__title">{collection.name}</span>
          <span className="featured-section__count">0</span>
          {menu}
        </div>
        <p className="my-collection__empty">Подборка пуста. Добавьте события через карточку события.</p>
      </div>
    );
  }

  if (loadingEvents || events === null) {
    return (
      <div className="featured-section">
        <div className="featured-section__header">
          <span className="featured-section__title">{collection.name}</span>
          <span className="featured-section__count">{collection.event_count}</span>
          {menu}
        </div>
        <p className="my-collection__empty">Загрузка…</p>
      </div>
    );
  }

  return (
    <FeaturedCarousel
      title={collection.name}
      items={events}
      onCardClick={onCardClick}
      headerExtra={menu}
    />
  );
}

function MyCollectionsPanel() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { collections, loading, create, rename, remove } = useCollections();

  const [openMenuId, setOpenMenuId] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createValue, setCreateValue] = useState('');
  const [createBusy, setCreateBusy] = useState(false);
  const [renameTarget, setRenameTarget] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameBusy, setRenameBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const handleOwnCardClick = (id) => {
    fetch(`https://ritmevents.ru/api/v1/events/${id}/view`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ source: 'profile' }),
    });
    navigate(`/events/${id}`);
  };

  const handleCreate = async () => {
    const name = createValue.trim();
    if (!name) return;
    setCreateBusy(true);
    try {
      await create(name);
      setCreateOpen(false);
      setCreateValue('');
    } catch {
      /* toast not needed here — modal stays open, user can retry */
    } finally {
      setCreateBusy(false);
    }
  };

  const handleRename = async () => {
    const name = renameValue.trim();
    if (!name || !renameTarget) return;
    setRenameBusy(true);
    try {
      await rename(renameTarget.id, name);
      setRenameTarget(null);
    } catch {
      /* keep modal open on failure */
    } finally {
      setRenameBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      await remove(deleteTarget.id);
      setDeleteTarget(null);
    } catch {
      /* keep modal open on failure */
    } finally {
      setDeleteBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <p>Загрузка...</p>
      </div>
    );
  }

  if (collections.length === 0) {
    return (
      <>
        <Placeholder
          className="placeholder"
          header="У вас пока нет подборок"
          description="Добавьте событие в подборку через карточку события"
          action={
            <button className="digest__knowMore" onClick={() => setCreateOpen(true)}>
              Создать подборку
            </button>
          }
        />
        {createOpen && (
          <div className="modal-overlay" onClick={() => setCreateOpen(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3>Новая подборка</h3>
              <input
                type="text"
                className="collection-name-input"
                value={createValue}
                onChange={(e) => setCreateValue(e.target.value)}
                placeholder="Название подборки"
                maxLength={100}
                autoFocus
              />
              <div className="modal-actions">
                <button className="modal-cancel-btn" onClick={() => setCreateOpen(false)}>Отмена</button>
                <button className="modal-confirm-btn" onClick={handleCreate} disabled={createBusy || !createValue.trim()}>
                  Создать
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      {collections.map((collection) => (
        <MyCollectionSection
          key={collection.id}
          collection={collection}
          token={token}
          onCardClick={handleOwnCardClick}
          isMenuOpen={openMenuId === collection.id}
          onToggleMenu={() => setOpenMenuId(prev => prev === collection.id ? null : collection.id)}
          onCloseMenu={() => setOpenMenuId(null)}
          onRename={() => { setRenameTarget(collection); setRenameValue(collection.name); }}
          onDelete={() => setDeleteTarget(collection)}
        />
      ))}

      {renameTarget && (
        <div className="modal-overlay" onClick={() => setRenameTarget(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Переименовать подборку</h3>
            <input
              type="text"
              className="collection-name-input"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              maxLength={100}
              autoFocus
            />
            <div className="modal-actions">
              <button className="modal-cancel-btn" onClick={() => setRenameTarget(null)}>Отмена</button>
              <button className="modal-confirm-btn" onClick={handleRename} disabled={renameBusy || !renameValue.trim()}>
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Удалить подборку «{deleteTarget.name}»?</h3>
            <p>Это действие нельзя отменить.</p>
            <div className="modal-actions">
              <button className="modal-cancel-btn" onClick={() => setDeleteTarget(null)}>Отмена</button>
              <button className="modal-confirm-btn" onClick={handleDelete} disabled={deleteBusy}>
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function Featured() {
  const { token, isAuthReady, isCheckingAuth, setShowInputCode } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('recommendations');

  useEffect(() => {
    if (!isAuthReady || !token) return;

    setLoading(true);
    setError(false);

    fetch('https://ritmevents.ru/api/v1/featured', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (res.status === 401) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user_id');
          setShowInputCode(true);
          return;
        }
        if (!res.ok) throw new Error('network');
        const json = await res.json();
        setData(json);
        reportImpressions(json?.for_you?.items, 'for_you');
        reportImpressions(json?.top_month?.items, 'top_month');
        reportImpressions(json?.top_half_year?.items, 'top_half_year');
        reportImpressions(json?.sber?.items, 'sber');
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [isAuthReady, token, setShowInputCode]);

  const reportImpressions = (items, block) => {
    if (!items?.length) return;
    fetch('https://ritmevents.ru/api/v1/events/impressions', {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ event_ids: items.map(e => e.id), source: 'featured', block }),
    });
  };

  const handleCardClick = (id, block) => {
    fetch(`https://ritmevents.ru/api/v1/events/${id}/view`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ source: 'featured', ...(block ? { block } : {}) }),
    });
    navigate(`/events/${id}`);
  };

  let hintAssigned = false;
  const claimHint = (items) => {
    if (hintAssigned || !items || items.length === 0) return false;
    hintAssigned = true;
    return true;
  };

  const subTabSwitcher = (
    <div className="featured-subtabs">
      <button
        type="button"
        className={`featured-subtabs__btn ${activeSubTab === 'recommendations' ? 'featured-subtabs__btn--active' : ''}`}
        onClick={() => setActiveSubTab('recommendations')}
      >
        Рекомендации
      </button>
      <button
        type="button"
        className={`featured-subtabs__btn ${activeSubTab === 'mine' ? 'featured-subtabs__btn--active' : ''}`}
        onClick={() => setActiveSubTab('mine')}
      >
        Мои подборки
      </button>
    </div>
  );

  if (activeSubTab === 'mine') {
    return (
      <div className="featured">
        {subTabSwitcher}
        <MyCollectionsPanel />
      </div>
    );
  }

  if (isCheckingAuth || loading) {
    return (
      <div className="featured">
        {subTabSwitcher}
        <div className="loading-container">
          <div className="spinner" />
          <p>Загрузка...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="featured">
        {subTabSwitcher}
        <p style={{ textAlign: 'center', color: '#888', marginTop: 32 }}>
          Не удалось загрузить рекомендации. Попробуйте позже.
        </p>
      </div>
    );
  }

  return (
    <div className="featured">
      {subTabSwitcher}
      {data?.for_you === null ? (
        <Placeholder
          className="placeholder"
          header="Персональные рекомендации"
          description="Заполни профиль, чтобы получать события подобранные специально для тебя"
          action={
            <button
              className="digest__knowMore"
              onClick={() => navigate('/profile')}
            >
              Заполнить профиль
            </button>
          }
        />
      ) : (
        <FeaturedCarousel
          title="Что-то для тебя"
          items={data?.for_you?.items}
          onCardClick={(id) => handleCardClick(id, 'for_you')}
          variant="foryou"
          showHint={claimHint(data?.for_you?.items)}
        />
      )}
      <FeaturedCarousel
        title="Главное за месяц"
        items={data?.top_month?.items}
        onCardClick={(id) => handleCardClick(id, 'top_month')}
        showHint={claimHint(data?.top_month?.items)}
      />
      <FeaturedCarousel
        title="Главное за 6 месяцев"
        items={data?.top_half_year?.items}
        onCardClick={(id) => handleCardClick(id, 'top_half_year')}
        variant="halfyear"
        showHint={claimHint(data?.top_half_year?.items)}
      />
      <FeaturedCarousel
        title="Открывая Сбер"
        items={data?.sber?.items}
        onCardClick={(id) => handleCardClick(id, 'sber')}
        variant="sber"
        showHint={claimHint(data?.sber?.items)}
      />
    </div>
  );
}
