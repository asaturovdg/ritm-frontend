import { useState, useEffect, useRef } from 'react';
import { Placeholder } from '@telegram-apps/telegram-ui';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, MapPin, RussianRuble, Hand } from 'lucide-react';
import { useAuth } from '../../components/AuthContext.jsx';
import './Featured.css';

const formatDate = (d) => d ? d.split('-').reverse().join('.') : '';
const formatTime = (t) => t ? t.substring(0, 5) : '';

const VARIANT_ICON_COLOR = {
  default: '#1032A1',
  sber: '#0A8043',
  foryou: '#8A3FFC',
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

function FeaturedCarousel({ title, items, onCardClick, variant = 'default', showHint = false }) {
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
        <span className="featured-section__count">{items.length} событий</span>
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
              <Hand size={22} color={getIconColor(variant)} strokeWidth={2} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Featured() {
  const { token, isAuthReady, isCheckingAuth, setShowInputCode } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [isAuthReady, token, setShowInputCode]);

  const handleCardClick = (id) => {
    fetch(`https://ritmevents.ru/api/v1/events/${id}/view`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ source: 'featured' }),
    });
    navigate(`/events/${id}`);
  };

  if (isCheckingAuth || loading) {
    return (
      <div className="featured">
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
        <p style={{ textAlign: 'center', color: '#888', marginTop: 32 }}>
          Не удалось загрузить рекомендации. Попробуйте позже.
        </p>
      </div>
    );
  }

  let hintAssigned = false;
  const claimHint = (items) => {
    if (hintAssigned || !items || items.length === 0) return false;
    hintAssigned = true;
    return true;
  };

  return (
    <div className="featured">
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
          onCardClick={handleCardClick}
          variant="foryou"
          showHint={claimHint(data?.for_you?.items)}
        />
      )}
      <FeaturedCarousel
        title="Главное за месяц"
        items={data?.top_month?.items}
        onCardClick={handleCardClick}
        showHint={claimHint(data?.top_month?.items)}
      />
      <FeaturedCarousel
        title="Открывая Сбер"
        items={data?.sber?.items}
        onCardClick={handleCardClick}
        variant="sber"
        showHint={claimHint(data?.sber?.items)}
      />
    </div>
  );
}
