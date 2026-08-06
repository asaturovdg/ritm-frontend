import { useState, useEffect } from 'react';
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

async function submitPulseCheck(token, score) {
  const response = await fetch('https://ritmevents.ru/api/v1/feedback/pulse-check', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ score, comment: null }),
  });
  if (!response.ok) {
    throw new Error('pulse-check submit failed');
  }
}

export default function PulseCheckBanner() {
  const { token } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(registerDigestOpen());
  }, []);
  const [step, setStep] = useState('question'); // 'question' | 'thanks'
  const [dismissed, setDismissed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!visible || dismissed) return null;

  const handleScore = async (value) => {
    if (isSubmitting) return; // Guard against double-submit
    setIsSubmitting(true);
    try {
      await submitPulseCheck(token, value);
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
                disabled={isSubmitting}
              >
                {emoji}
              </button>
            ))}
          </div>
        </>
      )}

      {step === 'thanks' && (
        <p className="pulse-check-banner__title">Спасибо за отзыв!</p>
      )}
    </div>
  );
}
