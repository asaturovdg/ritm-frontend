import { useState, useCallback, useEffect } from "react";
import './Profile.css'

export function Profile(){
    const [token, setToken] = useState(null);
    const [userData, setUserData] = useState(null);


    useEffect(() => {
        const accessToken = localStorage.getItem('access_token');
        if (accessToken){
            setToken(accessToken)
        }
        

    },[])

    useEffect(() => {
        if(!token) return false;

        const fetchData = async () => {
            try {
                const response = await fetch('https://ritmevents.ru/api/v1/users/me', {
                    headers: {
                        'Authorization': `Bearer ${token}`,  
                        'Content-Type': 'application/json'
                    }
                });

                if(response.ok){
                    const data = await response.json();
                    setUserData(data);
                }
            } catch (error) {
                console.error('Ошибка при запросе:', error);
            }
            
        }

        fetchData();
    }, [token])
    

    const parseStringToList = (str) => {
        return str.split(',').map(item => item.trim()).filter(item => item);
    }

    return(
          <div className="profile-container">
            <div className="profile-header">
                {/* <div className="profile-avatar">
                    {window.Telegram?.WebApp?.initDataUnsafe?.user?.photo_url ? (
                        <img 
                        src={window.Telegram.WebApp.initDataUnsafe.user.photo_url} 
                        alt="avatar"
                        className="profile-avatar-img"
                        />
                    ) : (
                        <div className="profile-avatar-placeholder">
                        {userData.username?.[0]?.toUpperCase() || '👤'}
                        </div>
                    )}
                </div> */}
        
        <div className="profile-info">
          {/* <h2 className="profile-name">
            {userData.username }
          </h2> */}
        </div>
      </div>

      <div className="profile-section">
        <h3 className="profile-section-title">Мои фильтры</h3>
        
        <div className="profile-field">
          <span className="profile-field-label">Города:</span>
          <div className="profile-tags">
            {parseStringToList(userData.city).map((city, idx) => (
              <span key={idx} className="profile-tag profile-tag-city">
                {city}
              </span>
            ))}
            {!userData.city && <span className="profile-empty-value">Не выбрано</span>}
          </div>
        </div>

        <div className="profile-field">
          <span className="profile-field-label">Категории:</span>
          <div className="profile-tags">
            {parseStringToList(userData.track).map((track, idx) => (
              <span key={idx} className="profile-tag profile-tag-track">
                {track}
              </span>
            ))}
            {!userData.track && <span className="profile-empty-value">Не выбрано</span>}
          </div>
        </div>

        <div className="profile-field">
          <span className="profile-field-label">Типы мероприятий:</span>
          <div className="profile-tags">
            {parseStringToList(userData.preferred_event_types).map((type, idx) => (
              <span key={idx} className="profile-tag profile-tag-event">
                {type}
              </span>
            ))}
            {!userData.preferred_event_types && <span className="profile-empty-value">Не выбрано</span>}
          </div>
        </div>

        <div className="profile-field">
          <span className="profile-field-label">Формат участия:</span>
          <div className="profile-tags">
            {parseStringToList(userData.preferred_participation_types).map((type, idx) => (
              <span key={idx} className="profile-tag profile-tag-participation">
                {type}
              </span>
            ))}
            {!userData.preferred_participation_types && <span className="profile-empty-value">Не выбрано</span>}
          </div>
        </div>
      </div>

      
    </div>
    )
    
}