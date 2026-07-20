import { useState, useEffect } from 'react';
import {
  FIELD_LABELS,
  FIELD_TYPES,
  FIELD_OPTIONS,
  validateFieldValue,
  normalizeFieldValue,
  serializePeople,
} from './moderationFields.js';

const UNCHANGED_SUMMARY_FIELDS = ['city', 'event_type'];

function buildInitialFieldState(suggestions) {
  const state = {};
  Object.entries(suggestions ?? {}).forEach(([key, value]) => {
    const initialValue = FIELD_TYPES[key] === 'people'
      ? serializePeople(value ?? [])
      : (Array.isArray(value) ? value.join(', ') : String(value ?? ''));
    state[key] = {
      checked: true,
      value: initialValue,
      ...validateFieldValue(key, initialValue),
    };
  });
  return state;
}

export default function ModerationCard({ event, index, total, onOpenList, onApprove, onReject }) {
  const [fields, setFields] = useState(() => buildInitialFieldState(event.suggestions));

  useEffect(() => {
    setFields(buildInitialFieldState(event.suggestions));
  }, [event.id, event.suggestions]);

  const suggestionKeys = Object.keys(event.suggestions ?? {});

  const handleValueChange = (key, rawValue) => {
    setFields((prev) => ({
      ...prev,
      [key]: { ...prev[key], value: rawValue, ...validateFieldValue(key, rawValue) },
    }));
  };

  const handleCheckedChange = (key, checked) => {
    setFields((prev) => ({ ...prev, [key]: { ...prev[key], checked } }));
  };

  const handleApprove = () => {
    const payload = {};
    suggestionKeys.forEach((key) => {
      const field = fields[key];
      if (field?.checked && field.valid) {
        payload[key] = normalizeFieldValue(key, field.value);
      }
    });
    onApprove(event.id, payload);
  };

  const unchangedSummary = UNCHANGED_SUMMARY_FIELDS
    .filter((key) => !(key in (event.suggestions ?? {})) && event[key])
    .map((key) => {
      const value = Array.isArray(event[key]) ? event[key].join(', ') : event[key];
      return `${FIELD_LABELS[key]}: ${value}`;
    })
    .join(' · ');

  return (
    <div className="moderation-card">
      <div className="moderation-card__header">
        <button type="button" className="moderation-card__counter" onClick={onOpenList}>
          {index + 1} / {total}
        </button>
        <span className="moderation-card__quality-badge">quality {event.quality_score}/5</span>
      </div>

      {suggestionKeys.map((key) => {
        const type = FIELD_TYPES[key] ?? 'text';
        const field = fields[key];
        const beforeRaw = event[key];
        const beforeText = type === 'people'
          ? serializePeople(beforeRaw ?? [])
          : (Array.isArray(beforeRaw) ? beforeRaw.join(', ') : String(beforeRaw ?? '—'));

        return (
          <div className="moderation-card__field" key={key}>
            <div className="moderation-card__field-label">{FIELD_LABELS[key] ?? key}</div>
            <div className="moderation-card__before">{beforeText}</div>

            {type === 'select' ? (
              <select
                className="moderation-card__input"
                value={field.value}
                onChange={(e) => handleValueChange(key, e.target.value)}
              >
                {(FIELD_OPTIONS[key] ?? []).map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            ) : type === 'text' || type === 'people' ? (
              <textarea
                className="moderation-card__input"
                rows={1}
                value={field.value}
                onChange={(e) => handleValueChange(key, e.target.value)}
              />
            ) : (
              <input
                className="moderation-card__input"
                type="text"
                value={field.value}
                onChange={(e) => handleValueChange(key, e.target.value)}
              />
            )}
            {!field.valid && <div className="moderation-card__field-error">{field.error}</div>}

            <label className="moderation-card__checkbox">
              <input
                type="checkbox"
                aria-label={`принять правку: ${FIELD_LABELS[key] ?? key}`}
                checked={field.checked}
                onChange={(e) => handleCheckedChange(key, e.target.checked)}
              />
              <span>принять правку</span>
            </label>
          </div>
        );
      })}

      {unchangedSummary && (
        <div className="moderation-card__unchanged">{unchangedSummary} <span>(без изменений)</span></div>
      )}

      <div className="moderation-card__footer">
        <button type="button" className="moderation-card__btn" onClick={() => onReject(event.id)}>
          Пропустить
        </button>
        <button type="button" className="moderation-card__btn moderation-card__btn--primary" onClick={handleApprove}>
          Принять выбранное
        </button>
      </div>
    </div>
  );
}
