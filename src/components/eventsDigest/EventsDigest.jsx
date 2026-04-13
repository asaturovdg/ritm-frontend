import React, { useEffect, useState } from "react";
import eventsData from "../../data/mock_events.json";
import './EventsDigest.css';
import dateIcon from "../../../public/DateRange.svg";
import cityIcon from "../../../public/BaselinePlace.svg";
import moneyIcon from "../../../public/Money.svg";
import { Link } from "react-router-dom";

export default function EventsDigest() {
    const [theme, setTheme] = useState('light');

    useEffect(() => {
        
        if (window.Telegram && window.Telegram.WebApp) {
            const tg = window.Telegram.WebApp;
            setTheme(tg.colorScheme);
            

            tg.onEvent('themeChanged', () => {
                setTheme(tg.colorScheme);
                
                updateIconFilter(tg.colorScheme);
            });
        }
    }, []);

    const updateIconFilter = (colorScheme) => {
        const icons = document.querySelectorAll('.event__city img, .event__price img, .event__date img');
        icons.forEach(icon => {
            if (colorScheme === 'dark') {
                icon.style.filter = 'brightness(0) invert(1)';
            } else {
                icon.style.filter = 'none';
            }
        });
    };

    return (
        <div className="events">
            {eventsData.map(event => (
                
                    <div  className="digest__item">
                    <div className="digest__info">
                        <p className="digest__date">
                            <img src={dateIcon} alt="icon date" />
                            {event.start_date?.split('-').reverse().join('.')}
                        </p>
                        <p className="digest__type">{event.event_type?.[0]}</p>
                    </div>
                    <h3 className="digest__title">{event.title}</h3>
                    <p className="digest__tags">
                        Тэги:
                        {event.track?.map((tag, index) => (
                            <span key={index} className="digest__tag">{tag}</span>
                        ))}
                    </p>
                    <div className="digest__footer">
                        <p className="digest__city">
                            <img src={cityIcon} alt="city icon" />
                            {event.city?.[0]}
                        </p>
                        <p className="digest__price">
                            {/* <img src={moneyIcon} alt="money icon" /> */}
                            {event.price || "Бесплатно"}
                        </p>
                    </div>
                    <Link key={event.id} to={`/events/${event.id}`}>
                        <button className="btn digest__knowMore">ПОДРОБНЕЕ</button>
                    </Link>
                    
                </div>
                
                
            ))}
        </div>
    );
}