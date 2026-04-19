import React, { useState, useMemo, useEffect } from "react";
import { Button, Placeholder } from '@telegram-apps/telegram-ui';
import eventsData from "../../data/mock_events.json";
import './EventsDigest.css';
import { Link } from "react-router-dom";
import Filters from "../Filters/Filters";

import dateIcon from "../../assets/icons/DateRange.svg";
import timeIcon from "../../assets/icons/time.svg";
import priceIcon from "../../assets/icons/currency.svg";
import placeIcon from "../../assets/icons/Place.svg";

export default function EventsDigest({ filters, setFilters }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const activeCount = Object.values(filters).flat().length;
  const isFilterApplied = activeCount > 0;

  const filteredEvents = useMemo(() => {
    if (!isFilterApplied) return [];
    
    return eventsData.filter(event => {
      if (filters.cities.length > 0 && !event.city?.some(c => filters.cities.includes(c))) return false;
      if (filters.categories.length > 0 && !filters.categories.includes(event.category)) return false;
      if (filters.eventTypes.length > 0 && !event.event_type?.some(t => filters.eventTypes.includes(t))) return false;
      if (filters.participationTypes.length > 0 && !filters.participationTypes.includes(event.participation_type)) return false;
      return true;
    });
  }, [filters, isFilterApplied]);

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
    }
  }, []);

  return (
    <div className="events">
      <div className="filters-header-sticky">
        <Button 
          mode="outline" 
          stretched 
          size="m" 
          onClick={() => setIsDrawerOpen(true)} 
          className="filters-open-btn"
        >
          Фильтры {activeCount > 0 && `(${activeCount})`}
        </Button>
      </div>

      <Filters 
        filters={filters} 
        onFilterChange={setFilters} 
        isOpen={isDrawerOpen} 
        setIsOpen={setIsDrawerOpen} 
      />

      <div className="digest-list">
        {!isFilterApplied ? (
          <Placeholder 
            className="placeholder"
            header="Выберите параметры" 
            description="Чтобы увидеть мероприятия, выберите интересующие вас категории"
          />
        ) : filteredEvents.length > 0 ? (
          filteredEvents.map(event => (
            <div key={event.id} className="digest__item">
              <div className="digest__header">
                <p className="digest__type">{event.event_type?.join(', ')}</p>
                <h3 className="digest__title">{event.title}</h3>
              </div>
              <div className="digest__mainInfo">
                <div className="digest__date-row">
                  {event.start_date && (
                    <div className="digest__day"><img src={dateIcon} alt="icon" /> {event.start_date.split('-').reverse().join('.')}</div>
                  )}
                  {event.start_time && (
                    <div className="digest__time"><img src={timeIcon} alt="icon" /> {event.start_time}</div>
                  )}
                </div>
                {Number.isInteger(event.price) && (
                  <div className="digest__price"><img src={priceIcon} alt="ruble icon" /> {event.price === 0 ? "Бесплатно" : event.price}</div>
                )}
                <div className="digest__location"><img src={placeIcon} alt="icon" /> {event.city?.join(', ')}</div>
              </div>
              {event.tags && event.tags.length > 0 && (
                <div className="digest__tags">
                  {event.tags.map((tag, index) => (
                    <span key={index} className="digest__tag">#{tag}</span>
                  ))}
                </div>
              )}
              <Link to={`/events/${event.id}`} className="digest__link">
                <button className="btn digest__knowMore">ПОДРОБНЕЕ</button>
              </Link>
            </div>
          ))
        ) : (
          <p className="no-results">Мероприятий не найдено</p>
        )}
      </div>
    </div>
  );
}