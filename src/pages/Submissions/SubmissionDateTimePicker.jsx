import { useState, useMemo } from 'react';
import ReactCalendar from 'react-calendar';
import './SubmissionDateTimePicker.css';

const MONTH_NAMES = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

function toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function buildTimeSlots() {
  const slots = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return slots;
}

const TIME_SLOTS = buildTimeSlots();

export default function SubmissionDateTimePicker({ label, date, time, onConfirm, onClose }) {
  const initialDate = date ? new Date(`${date}T00:00:00`) : new Date();
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [selectedTime, setSelectedTime] = useState(time || '');
  const [activeStartDate, setActiveStartDate] = useState(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    return [current, current + 1, current + 2];
  }, []);

  const handleMonthChange = (e) => {
    const month = parseInt(e.target.value, 10);
    setActiveStartDate((prev) => new Date(prev.getFullYear(), month, 1));
  };

  const handleYearChange = (e) => {
    const year = parseInt(e.target.value, 10);
    setActiveStartDate((prev) => new Date(year, prev.getMonth(), 1));
  };

  const handleDayClick = (d) => {
    setSelectedDate(d);
    setActiveStartDate(new Date(d.getFullYear(), d.getMonth(), 1));
  };

  return (
    <div className="submission-datetime-picker__overlay" data-testid="datetime-picker-overlay" onClick={onClose}>
      <div className="submission-datetime-picker__sheet" onClick={(e) => e.stopPropagation()}>
        <div className="submission-datetime-picker__handle" />
        <div className="submission-datetime-picker__title">{label}</div>

        <div className="submission-datetime-picker__nav">
          <select data-testid="datetime-picker-month" value={activeStartDate.getMonth()} onChange={handleMonthChange}>
            {MONTH_NAMES.map((name, i) => (
              <option key={name} value={i}>{name}</option>
            ))}
          </select>
          <select data-testid="datetime-picker-year" value={activeStartDate.getFullYear()} onChange={handleYearChange}>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <ReactCalendar
          locale="ru-RU"
          value={selectedDate}
          activeStartDate={activeStartDate}
          onActiveStartDateChange={({ activeStartDate: next }) => next && setActiveStartDate(next)}
          onChange={handleDayClick}
          showNavigation={false}
          className="submission-datetime-picker__calendar"
          tileContent={({ date: d, view }) => {
            if (view !== 'month') return null;
            if (toDateStr(d) !== toDateStr(selectedDate)) return null;
            return <div className="submission-datetime-picker__tile-highlight" />;
          }}
        />

        <div className="submission-datetime-picker__time-label">Время</div>
        <div className="submission-datetime-picker__time-row" data-testid="datetime-picker-time-row">
          {TIME_SLOTS.map((slot) => (
            <button
              key={slot}
              type="button"
              className={`submission-datetime-picker__time-chip ${selectedTime === slot ? 'active' : ''}`}
              onClick={() => setSelectedTime(slot)}
            >
              {slot}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="submission-datetime-picker__confirm"
          data-testid="datetime-picker-confirm"
          disabled={!selectedTime}
          onClick={() => onConfirm(toDateStr(selectedDate), selectedTime)}
        >
          Готово
        </button>
      </div>
    </div>
  );
}
