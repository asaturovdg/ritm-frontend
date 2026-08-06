import { useState } from 'react';
import { useAuth } from '../AuthContext.jsx';
import { registerDigestOpen } from './pulseCheckStorage.js';
import './PulseCheckBanner.css';

const SCORES = [
  { value: 1, emoji: '😞' },
  { value: 2, emoji: '😕' },
  { value: 3, emoji: '🙂' },
  { value: 4, emoji: '😃' },
  { value: 5, emoji: '😍' },
];

async function submitPulseCheck(token, score, comment) {
  const response = await fetch('https://ritmevents.ru/api/v1/feedback/pulse-check', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ score, comment: comment || null }),
  });
  if (!response.ok) {
    throw new Error('pulse-check submit failed');
  }
}

export default function PulseCheckBanner() {
  const { token } = useAuth();
  const [visible] = useState(() => registerDigestOpen());
  const [step, setStep] = useState('question'); // 'question' | 'comment' | 'thanks'
  const [score, setScore] = useState(null);
  const [comment, setComment] = useState('');
  const [dismissed, setDismissed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!visible || dismissed) return null;

  const handleScore = (value) => {
    setScore(value);
    setStep('comment');
  };

  const finish = async () => {
    if (isSubmitting) return; // Guard against double-submit
    setIsSubmitting(true);
    try {
      await submitPulseCheck(token, score, comment.trim());
    } catch {
      // Best-effort: the banner still closes even if the network call fails,
      // since re-showing it would just repeat the same failure.
    }
    setStep('thanks');
    setTimeout(() => setDismissed(true), 1500);
  };

  return (
    <div className="pulse-check-banner">
      <button
        type="button"
        className="pulse-check-banner__close"
        aria-label="Закрыть"
        onClick={() => setDismissed(true)}
      >
        ×
      </button>

      {step === 'question' && (
        <>
          <p className="pulse-check-banner__title">Как тебе подборка?</p>
          <div className="pulse-check-banner__scores">
            {SCORES.map(({ value, emoji }) => (
              <button
                key={value}
                type="button"
                className="pulse-check-banner__score"
                aria-label={`Оценка ${value}`}
                onClick={() => handleScore(value)}
              >
                {emoji}
              </button>
            ))}
          </div>
        </>
      )}

      {step === 'comment' && (
        <>
          <p className="pulse-check-banner__title">Спасибо! Что-то ещё?</p>
          <input
            type="text"
            className="pulse-check-banner__input"
            placeholder="Комментарий (необязательно)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={280}
          />
          <button type="button" className="pulse-check-banner__submit" onClick={finish} disabled={isSubmitting}>
            Отправить
          </button>
        </>
      )}

      {step === 'thanks' && (
        <p className="pulse-check-banner__title">Спасибо за отзыв!</p>
      )}
    </div>
  );
}
