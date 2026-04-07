import React from "react";
import eventsData from "../../data/mock_events.json"
import './EventsDigest.css'
import dateIcon from "../../../public/DateRange.svg"
import cityIcon from "../../../public/BaselinePlace.svg"
import moneyIcon from "../../../public/Money.svg"
export default function EventsDigest(){


    
    return(
        <div className="events">
            {
                eventsData.map(event => (
                    <div key={event.id} className="event__item">
                        <div className="event__info">
                        <p className="event__date">
                            <img src={dateIcon} alt="icon date" className="c" />
                            {event.start_date.split('-').reverse().join('.')}
                            
                        </p>
                        
                        <p className="event__type">{event.event_type[0]}</p>
                        </div>
                        
                        
                        <h3 className="event__title">{event.title}</h3>
                        <p className="event__tags">
                            Тэги:
                            {event.track.map((tag,index) => (
                                <span key={index} className="event__tag">
                                    {tag}
                                </span>
                            ))}
                        </p>
                        <div className="event__footer">
                            <p className="event__city">
                            <img src={cityIcon} alt="city icon" />
                            {event.city[0]}
                        </p>
                        <p className="event__price">
                            <img src={moneyIcon} alt="money icon" />
                            {event.price || "Бесплатно"} 
                         </p>
                        </div>
                        
                        <button className="btn event__knowMore">ПОДРОБНЕЕ</button>
                    </div>
                ))
            }
        </div>
    )
}