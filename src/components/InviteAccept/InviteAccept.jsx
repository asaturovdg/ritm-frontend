import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function InviteAccept() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [ownerInfo, setOwnerInfo] = useState(null);
  const [error, setError] = useState(null);
  const [accepting, setAccepting] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);

  // Получаем превью приглашения
  useEffect(() => {
    const fetchPreview = async () => {
      try {
        // GET запрос на получение информации о приглашении (не требует авторизации)
        const response = await fetch(`https://ritmevents.ru/api/v1/assistants/invite/${token}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        console.log('Response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Invite data:', data);
          setOwnerInfo(data);
        } else if (response.status === 401) {
          // Может быть, нужен токен? Попробуем с токеном
          const accessToken = localStorage.getItem('access_token');
          if (accessToken) {
            const retryResponse = await fetch(`https://ritmevents.ru/api/v1/assistants/invite/${token}`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (retryResponse.ok) {
              const data = await retryResponse.json();
              setOwnerInfo(data);
            } else {
              setError('Приглашение недействительно или истекло');
            }
          } else {
            setError('Приглашение недействительно или истекло');
          }
        } else if (response.status === 404) {
          setError('Приглашение не найдено');
        } else if (response.status === 410) {
          setError('Срок действия приглашения истек');
        } else {
          setError('Ошибка при загрузке приглашения');
        }
      } catch (err) {
        console.error('Fetch error:', err);
        setError('Ошибка подключения к серверу');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchPreview();
    }
  }, [token]);

  // Принять приглашение
  const acceptInvite = async () => {
    setAccepting(true);
    setError(null);
    
    try {
      let accessToken = localStorage.getItem('access_token');
      
      // Если нет токена, перенаправляем на страницу входа
      if (!accessToken) {
        setNeedsAuth(true);
        setError('Для принятия приглашения необходимо авторизоваться');
        setAccepting(false);
        return;
      }
      
      const response = await fetch(`https://ritmevents.ru/api/v1/assistants/invite/${token}/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Accept response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Accept success:', data);
        alert('Вы успешно стали помощником!');
        navigate('/profile');
      } else if (response.status === 401) {
        localStorage.removeItem('access_token');
        setNeedsAuth(true);
        setError('Сессия истекла. Пожалуйста, войдите снова');
      } else if (response.status === 404) {
        setError('Приглашение не найдено');
      } else if (response.status === 410) {
        setError('Срок действия приглашения истек');
      } else if (response.status === 409) {
        setError('Вы уже являетесь помощником этого пользователя');
      } else {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        setError('Ошибка при принятии приглашения');
      }
    } catch (err) {
      console.error('Accept error:', err);
      setError('Не удалось подключиться к серверу');
    } finally {
      setAccepting(false);
    }
  };

  // Перенаправление на страницу входа
  const redirectToLogin = () => {
    navigate('/login', { state: { from: `/invite/assistant/${token}` } })
  };

  if (loading) {
    return (
      <div className="invite-page">
        <div className="loading-spinner"></div>
        <p>Загрузка информации о приглашении...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="invite-page">
        <div className="error-container">
          <h3>Ошибка</h3>
          <p>{error}</p>
          {needsAuth && (
            <button onClick={redirectToLogin} className="login-btn">
              Войти в аккаунт
            </button>
          )}
          <button onClick={() => navigate('/')} className="back-btn">
            На главную
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="invite-page">
      <div className="invite-card">
        <h2>Приглашение помощника</h2>
        
        {ownerInfo && (
          <div className="owner-info">
            <div className="owner-avatar">
              {ownerInfo.owner_name?.charAt(0) || '?'}
            </div>
            <div className="owner-details">
              <p className="owner-name">{ownerInfo.owner_name || 'Пользователь'}</p>
              <p className="owner-username">{ownerInfo.owner_username || ''}</p>
            </div>
          </div>
        )}
        
        <div className="invite-description">
          <p>Приглашает вас стать помощником.</p>
          <p>Как помощник, вы сможете:</p>
          <ul>
            <li>Добавлять события в календарь пользователя</li>
            <li>Управлять мероприятиями</li>
            <li>Получать уведомления</li>
          </ul>
        </div>
        
        {ownerInfo?.expires_at && (
          <p className="expires-at">
            Ссылка действительна до: {new Date(ownerInfo.expires_at).toLocaleString()}
          </p>
        )}
        
        <div className="invite-actions">
          <button 
            onClick={acceptInvite} 
            className="accept-btn"
            disabled={accepting}
          >
            {accepting ? 'Принятие...' : 'Принять приглашение'}
          </button>
          <button onClick={() => navigate('/')} className="cancel-btn">
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}