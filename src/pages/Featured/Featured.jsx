import { useState, useEffect } from 'react';
import { Placeholder } from '@telegram-apps/telegram-ui';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, MapPin, RussianRuble } from 'lucide-react';
import { useAuth } from '../../components/AuthContext.jsx';
import './Featured.css';

const formatDate = (d) => d ? d.split('-').reverse().join('.') : '';
const formatTime = (t) => t ? t.substring(0, 5) : '';

function FeaturedCard({ event, onClick }) {
  return (
    <button className="featured-card" onClick={onClick}>
      <div className="featured-card__header">
        <div className="featured-card__type">
          {event.event_type?.join(', ')}
        </div>
        <div className="featured-card__title">{event.title}</div>
      </div>
      <div className="featured-card__body">
        {event.start_date && (
          <div className="featured-card__meta-row">
            <Calendar size={12} color="#1032A1" strokeWidth={1.5} />
            {formatDate(event.start_date)}
            {event.start_time && (
              <>
                <Clock size={12} color="#1032A1" strokeWidth={1.5} />
                {formatTime(event.start_time)}
              </>
            )}
          </div>
        )}
        {event.city?.length > 0 && (
          <div className="featured-card__meta-row">
            <MapPin size={12} color="#1032A1" strokeWidth={1.5} />
            {event.city.join(', ')}
          </div>
        )}
        {typeof event.price === 'number' && (
          <div className="featured-card__meta-row">
            <RussianRuble size={12} color="#1032A1" strokeWidth={1.5} />
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

function FeaturedCarousel({ title, items, onCardClick }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="featured-section">
      <div className="featured-section__header">
        <span className="featured-section__title">{title}</span>
        <span className="featured-section__count">{items.length} событий</span>
      </div>
      <div className="featured-carousel">
        {items.map(event => (
          <FeaturedCard key={event.id} event={event} onClick={() => onCardClick(event.id)} />
        ))}
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
          title="Для вас"
          items={data?.for_you?.items}
          onCardClick={handleCardClick}
        />
      )}
      <FeaturedCarousel
        title="Главное за месяц"
        items={data?.top_month?.items}
        onCardClick={handleCardClick}
      />
      <FeaturedCarousel
        title="Открывая Сбер"
        items={data?.sber?.items}
        onCardClick={handleCardClick}
      />
    </div>
  );
}
