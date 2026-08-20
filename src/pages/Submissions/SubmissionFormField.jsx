import { useState } from 'react';
import SubmissionDateTimePicker from './SubmissionDateTimePicker.jsx';
import { FIELD_DEFS } from './submissionFormFields.js';
import { formatDate, formatTime } from './submissionFormat.js';
import { useCustomCities } from '../../hooks/useCustomCities.js';
import './SubmissionFormField.css';

const TELEGRAM_RE = /^@?[a-zA-Z0-9_]{5,32}$/;
const EMAIL_RE = /^[^\s@]+@([^\s@.,]+\.)+[^\s@.,]{2,}$/;
const WEBSITE_RE = /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)$/;
const CONTACT_PERSON_RE = /^[а-яА-Яa-zA-Z\s-.]*$/;

export default function SubmissionFormField({ fieldId, formData, error, onFieldChange, onDateTimeChange }) {
  const def = FIELD_DEFS[fieldId];
  const [tempTag, setTempTag] = useState('');
  const [openPicker, setOpenPicker] = useState(null); // 'start' | 'end' | null
  const [cityInput, setCityInput] = useState('');
  const { customCities, addCustomCity } = useCustomCities();
  // Buffered locally (not read back from formData) so keystrokes accumulate
  // correctly even when the parent doesn't re-render synchronously on every
  // onFieldChange call — otherwise React resets the controlled input's DOM
  // value back to the stale formData value on each keystroke.
  const [textValue, setTextValue] = useState(() => formData[fieldId]);
  const [urlValue, setUrlValue] = useState(() => formData[fieldId] || '');

  const label = `${def.label}${def.required ? ' *' : ''}`;

  const addTag = () => {
    if (!tempTag.trim()) return;
    onFieldChange(fieldId, [...formData[fieldId], tempTag.trim()]);
    setTempTag('');
  };

  const removeTag = (idx) => {
    onFieldChange(fieldId, formData[fieldId].filter((_, i) => i !== idx));
  };

  const addCustomCityOption = () => {
    const city = addCustomCity(cityInput);
    setCityInput('');
    if (!city) return;
    onFieldChange('city', [...formData.city, city]);
  };

  return (
    <div className="submission-form-field">
      <div className="submission-form-field__label">{label}</div>

      {def.type === 'text' && (
        <input
          type="text"
          className="submission-form-field__input"
          value={textValue}
          onChange={(e) => {
            let value = e.target.value;
            if (fieldId === 'contact_person' && !CONTACT_PERSON_RE.test(value)) return;
            if (fieldId === 'contact_telegram') value = value.replace(/\s/g, '');
            setTextValue(value);
            onFieldChange(fieldId, value);
          }}
        />
      )}

      {def.type === 'textarea' && (
        <textarea
          className="submission-form-field__textarea"
          rows={4}
          value={formData[fieldId]}
          onChange={(e) => onFieldChange(fieldId, e.target.value)}
        />
      )}

      {def.type === 'address' && (
        <textarea
          className="submission-form-field__textarea"
          rows={3}
          placeholder="Если ещё нет площадки, можно написать 'Ищу площадку'"
          value={formData.address}
          onChange={(e) => onFieldChange('address', e.target.value)}
        />
      )}

      {def.type === 'multiselect' && (
        <div className="submission-form-field__chips">
          {[...def.options, ...(fieldId === 'city' ? customCities : [])].map((opt) => (
            <button
              type="button"
              key={opt}
              className={`submission-form-field__chip ${formData[fieldId]?.includes(opt) ? 'active' : ''}`}
              onClick={() => {
                const current = formData[fieldId];
                onFieldChange(fieldId, current.includes(opt) ? current.filter((v) => v !== opt) : [...current, opt]);
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {def.type === 'multiselect' && fieldId === 'city' && (
        <div className="submission-form-field__tag-input-row">
          <input
            type="text"
            className="submission-form-field__input"
            placeholder="Другой город..."
            value={cityInput}
            onChange={(e) => setCityInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomCityOption(); } }}
          />
          <button type="button" className="submission-form-field__add-tag" onClick={addCustomCityOption}>Добавить</button>
        </div>
      )}

      {def.type === 'number' && (
        <input
          type="number"
          className="submission-form-field__input"
          value={formData[fieldId]}
          min="1"
          max="1000"
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            if (val <= 1000 || !e.target.value) onFieldChange(fieldId, e.target.value);
          }}
        />
      )}

      {def.type === 'price' && (
        <input
          type="number"
          className="submission-form-field__input"
          value={formData[fieldId]}
          min="0"
          step="1"
          onKeyDown={(e) => { if (e.key === '-' || e.key === 'Minus') e.preventDefault(); }}
          onChange={(e) => {
            const value = e.target.value;
            if (value === '' || parseFloat(value) >= 0) onFieldChange(fieldId, value);
          }}
        />
      )}

      {def.type === 'url' && (
        <input
          type="url"
          className="submission-form-field__input"
          placeholder="https://"
          value={urlValue}
          onChange={(e) => {
            let value = e.target.value;
            if (fieldId === 'contact_website' && value && !value.startsWith('http://') && !value.startsWith('https://') && value.includes('.')) {
              value = `https://${value}`;
            }
            setUrlValue(value);
            onFieldChange(fieldId, value);
          }}
        />
      )}

      {def.type === 'email' && (
        <input
          type="email"
          className="submission-form-field__input"
          placeholder="me@mail.ru"
          value={formData[fieldId] || ''}
          onChange={(e) => onFieldChange(fieldId, e.target.value.toLowerCase())}
        />
      )}

      {def.type === 'tags' && (
        <div className="submission-form-field__tags">
          <div className="submission-form-field__tags-list">
            {formData[fieldId].map((tag, idx) => (
              <span key={idx} className="submission-form-field__tag">
                {tag}
                <button type="button" onClick={() => removeTag(idx)}>×</button>
              </span>
            ))}
          </div>
          <div className="submission-form-field__tag-input-row">
            <input
              type="text"
              className="submission-form-field__input"
              value={tempTag}
              onChange={(e) => setTempTag(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
            />
            <button type="button" className="submission-form-field__add-tag" onClick={addTag}>Добавить</button>
          </div>
        </div>
      )}

      {def.type === 'datetime' && (
        <div className="submission-form-field__datetime">
          <button
            type="button"
            className="submission-form-field__datetime-row"
            data-testid="datetime-trigger-start"
            onClick={() => setOpenPicker('start')}
          >
            Начало: {formData.start_date ? `${formatDate(formData.start_date)}${formData.start_time ? `, ${formatTime(formData.start_time)}` : ''}` : 'выбрать'}
          </button>
          <button
            type="button"
            className="submission-form-field__datetime-row"
            data-testid="datetime-trigger-end"
            onClick={() => setOpenPicker('end')}
          >
            Окончание: {formData.end_date ? `${formatDate(formData.end_date)}${formData.end_time ? `, ${formatTime(formData.end_time)}` : ''}` : 'выбрать'}
          </button>

          {openPicker === 'start' && (
            <SubmissionDateTimePicker
              label="Начало события"
              date={formData.start_date}
              time={formData.start_time}
              onClose={() => setOpenPicker(null)}
              onConfirm={(date, time) => {
                onDateTimeChange({ start_date: date, start_time: time });
                setOpenPicker(null);
              }}
            />
          )}
          {openPicker === 'end' && (
            <SubmissionDateTimePicker
              label="Окончание события"
              date={formData.end_date || formData.start_date}
              time={formData.end_time}
              onClose={() => setOpenPicker(null)}
              onConfirm={(date, time) => {
                onDateTimeChange({ end_date: date, end_time: time });
                setOpenPicker(null);
              }}
            />
          )}
        </div>
      )}

      {fieldId === 'contact_telegram' && formData.contact_telegram && !TELEGRAM_RE.test(formData.contact_telegram.replace('@', '')) && (
        <p className="submission-form-field__hint">Неверный формат Telegram</p>
      )}
      {fieldId === 'contact_email' && formData.contact_email && !EMAIL_RE.test(formData.contact_email) && (
        <p className="submission-form-field__hint">Неверный формат email</p>
      )}
      {fieldId === 'contact_website' && formData.contact_website && !WEBSITE_RE.test(formData.contact_website) && (
        <p className="submission-form-field__hint">Неверный формат ссылки</p>
      )}

      {error && <p className="submission-form-field__error">{error}</p>}
    </div>
  );
}
