import './Filters.css'
import { CITIES, CATEGORIES, EVENT_TYPES, PARTICIPATION_TYPES } from "../../data/filters.js"
import closeIcon from "../../assets/icons/close.svg"
import { useEffect, useState } from "react"

export default function Filters({ filters, onFilterChange, isOpen, setIsOpen, onReset }) {
  const [tempFilters, setTempFilters] = useState(filters);

  useEffect(() => {
    if (isOpen) {
      setTempFilters(filters);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isOpen, filters]);

  const handleFilterChange = (sectionKey, value) => {
    const currentValues = tempFilters[sectionKey] || [];
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value];
    
    setTempFilters({ ...tempFilters, [sectionKey]: newValues });
  };

  const applyFilters = () => {
    onFilterChange(tempFilters);
    setIsOpen(false);
  };

  const resetFilters = () => {
    const emptyFilters = {
      cities: [],
      categories: [],
      eventTypes: [],
      participationTypes: []
    };
    setTempFilters(emptyFilters);
    if (onReset) onReset();
  };

  if (!isOpen) return null;

  return (
    <div className="filters-drawer-overlay" onClick={applyFilters}>  
      <div className="filters-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="filters__header">
          <h1>Фильтры</h1>
          <button className='close-filter-btn' onClick={applyFilters}>  
            <img src={closeIcon} alt="close" />
          </button>
        </div>

        <div className="filter-section">
          <h3 className="filter-section__title">Категории</h3>
          <div className="chips-container">
            {CATEGORIES.map((category, index) => (
              <button 
                key={index} 
                className={`chip ${tempFilters.categories.includes(category) ? 'chip-active' : ''}`}  
                onClick={() => handleFilterChange('categories', category)}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-section">
          <h3 className="filter-section__title">Город</h3>
          <div className="cities-list">
            {CITIES.map((city, index) => (
              <label key={index} className='checkbox-item'>
                <input 
                  type="checkbox" 
                  checked={tempFilters.cities.includes(city)}  
                  onChange={() => handleFilterChange('cities', city)} 
                />
                <span>{city}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="filter-section">
          <h3 className="filter-section__title">Тип мероприятия</h3>
          <div className="chips-container">
            {EVENT_TYPES.map((type, index) => (
              <button 
                key={index} 
                onClick={() => handleFilterChange('eventTypes', type)}
                className={`chip ${tempFilters.eventTypes.includes(type) ? 'chip-active' : ''}`}  
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-section">
          <h3 className='filter-section__title'>Тип участия</h3>
          <div className='participateType-list'>
            {PARTICIPATION_TYPES.map((partType, index) => (
              <label key={index} className='checkbox-item'>
                <input 
                  type="checkbox" 
                  checked={tempFilters.participationTypes.includes(partType)}  
                  onChange={() => handleFilterChange('participationTypes', partType)} 
                />
                <span>{partType}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="filter-actions">
          <button className='apply-filters__btn' onClick={applyFilters}> 
            Показать результаты
          </button>
          <button className='reset-filters__btn' onClick={resetFilters}>
            Сбросить всё
          </button>
        </div>
      </div>
    </div>
  );
}