import { useState } from 'react';
import { useAuth } from '../../components/AuthContext.jsx';
import { useToast } from '../../components/Toast/ToastContext.jsx';

const CATEGORIES = [
  { value: 'bug', label: 'Баг' },
  { value: 'idea', label: 'Идея' },
  { value: 'other', label: 'Другое' },
];

export default function UxFeedbackModal({ onClose }) {
  const { token } = useAuth();
  const showToast = useToast();
  const [category, setCategory] = useState(null);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = category !== null && message.trim().length > 0 && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      const response = await fetch('https://ritmevents.ru/api/v1/feedback/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ category, message: message.trim() }),
      });
      if (!response.ok) throw new Error('report submit failed');
      showToast('Спасибо, мы получили сообщение!');
      onClose();
    } catch {
      showToast('Не удалось отправить. Попробуй ещё раз.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>Сообщить о проблеме или идее</h3>

        <div className="filter-section">
          <div className="profile_chips-container">
            {CATEGORIES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                className={`profile_chip ${category === value ? 'profile_chip-active' : ''}`}
                onClick={() => setCategory(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <textarea
          className="ux-feedback-modal__textarea"
          placeholder="Опиши, что случилось или что предлагаешь"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={2000}
          rows={5}
        />

        <div className="modal-actions">
          <button
            type="button"
            className="modal-confirm-btn"
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {isSubmitting ? 'Отправка...' : 'Отправить'}
          </button>
        </div>
      </div>
    </div>
  );
}
