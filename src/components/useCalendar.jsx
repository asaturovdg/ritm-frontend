import { useState, useCallback, use } from "react";

const API_URL = "https://ritmevents.ru/api/v1"

export function useCalendar(){
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState(null);

    const connectCalendar = useCallback(async (provider, token) => {
        if (!token){
            console.log('нет токена авторизации');
            return null;
        }
        setIsConnecting(true);
        setError(null);
        try {
            const response = await fetch(`${API_URL}/calendars/connect`, {
            method:'POST',
            headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
            },
            body: JSON.stringify({provider: provider})
        });
        
       if (response.ok) {
        const data = await response.json();
        console.log(`OAuth URL для ${provider} получен`);
        return data.oauth_url;
      } 
    } catch (err) {
      console.error('Ошибка при подключении календаря:', err);
      setError('Не удалось подключиться к серверу');
      return null;
    } finally {
      setIsConnecting(false);
    }
  }, []);


  const addEventToCalendar = useCallback (async (eventData, token) => {
    if (!token){
            console.log('нет токена авторизации');
            return null;
        }

        try {
            const 
            
        } catch (error) {
            
        }
  })


  const checkCalendarConnection = useCallback( async (token) => {
    if(!token){
        console.log('нет токена авторизации');
        return false;
    }

    try {
        
    } catch (error) {
        
    }
  })
}