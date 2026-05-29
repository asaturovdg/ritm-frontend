import { useState } from "react";
import "./Feedback.css";
import emptyStar from "../../assets/icons/star_empty.svg";
import filledStar from "../../assets/icons/star_filled.svg";
import { useAuth } from "../../components/AuthContext.jsx";

export default function Feedback() {
  const { token } = useAuth();

  const [answers, setAnswers] = useState({
    q1: 0,
    q2: 0,
    q3: 0,
    q4: 0,
    q5: 0,
    q6: 0,
    q7: 0,
    q8: 0,
    q9: 0,
    q10: null,
    q10_sub: null,
    q11: ""
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [error, setError] = useState(null);

    const handleRatingChange = (questionId, value, currentValue) => {
   
    if (currentValue === value) {
      setAnswers(prev => ({ ...prev, [questionId]: 0 }));
    } else {
      setAnswers(prev => ({ ...prev, [questionId]: value }));
    }
  };

  const handleBooleanChange = (value) => {
    setAnswers(prev => ({ ...prev, q10: value }));
  };

  const handleBooleanSubChange = (value) => {
    setAnswers(prev => ({ ...prev, q10_sub: value }));
  };

  const handleTextChange = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const validateAnswers = () => {
  for (let i = 1; i <= 9; i++) {
    if (answers[`q${i}`] === 0) {
      setError('Пожалуйста, заполните все поля формы');
      return false;
    }
  }
  
  // Проверка вопроса 10
  if (answers.q10 === null) {
    setError('Пожалуйста, заполните все поля формы');
    return false;
  }
  
  // Проверка дополнительного вопроса, если ответили Да на вопрос 10
  if (answers.q10 === true && answers.q10_sub === null) {
    setError('Пожалуйста, заполните все поля формы');
    return false;
  }
  
  
  if (!answers.q11 || answers.q11.trim() === '') {
    setError('Пожалуйста, заполните все поля формы');
    return false;
  }
  
  return true;
};

  const submitFeedback = async () => {
  if (!token) {
    setError('Необходима авторизация. Пожалуйста, войдите в аккаунт.');
    return;
  }

  if (!validateAnswers()) {
    return;
  }

  setIsSubmitting(true);
  setError(null);

  try {
    const source = 'miniapp';
    
    
    const requestBody = {
      source,
      q1: answers.q1,
      q2: answers.q2,
      q3: answers.q3,
      q4: answers.q4,
      q5: answers.q5,
      q6: answers.q6,
      q7: answers.q7,
      q8: answers.q8,
      q9: answers.q9,
      q10: answers.q10,
      q11: answers.q11
    };
    
    
    if (answers.q10 === true) {
      requestBody.q10_sub = answers.q10_sub;
    }

    const response = await fetch('https://ritmevents.ru/api/v1/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(requestBody)
    });

    if (response.ok) {
      setIsCompleted(true);
    } else {
      const errorData = await response.text();
      throw new Error(errorData || 'Ошибка при отправке отзыва');
    }
  } catch (err) {
    setError(err.message);
  } finally {
    setIsSubmitting(false);
  }
};

  const resetFeedback = () => {
    setAnswers({
      q1: 0, q2: 0, q3: 0, q4: 0, q5: 0,
      q6: 0, q7: 0, q8: 0, q9: 0,
      q10: null,
      q10_sub: null,
      q11: ""
    });
    setIsCompleted(false);
    setError(null);
  };

  const renderStars = (questionId, currentValue) => {
    return (
      <div className="stars-container">
        {[1, 2, 3, 4, 5].map((star) => (
          <img
            key={star}
            src={currentValue >= star ? filledStar : emptyStar}
            alt={currentValue >= star ? "filled star" : "empty star"}
            className="star"
            onClick={() => handleRatingChange(questionId, star, currentValue)}
          />
        ))}
      </div>
    );
  };

  if (isCompleted) {
    return (
      <div className="feedback-completed">
        <div className="completion-card">
          <div className="completion-icon"></div>
          <h2>Спасибо за ваш отзыв!</h2>
          <p>Ты помогаешь нам стать лучше </p>
          <button onClick={resetFeedback} className="feedback-button">
            Пройти опрос заново
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="feedback-container">
      <div className="feedback-header">
        <h1>Обратная связь</h1>
      </div>

      <div className="feedback-form">
        {error && <div className="error-message">{error}</div>}

        {/* Вопрос 1 */}
        <div className="question-block">
          <label className="question-label">
            <span className="required-star">*</span>1. Насколько легко тебе было вносить ответы?
          </label>
          {renderStars('q1', answers.q1)}
        </div>

        {/* Вопрос 2 */}
        <div className="question-block">
          <label className="question-label">
           <span className="required-star">*</span>2. Удобно ли настраивать фильтры (что ищешь)?
          </label>
          {renderStars('q2', answers.q2)}
        </div>

        {/* Вопрос 3 */}
        <div className="question-block">
          <label className="question-label">
            <span className="required-star">*</span>3. Понятно ли, как двигаться по сценарию (что за чем происходит)?
          </label>
          {renderStars('q3', answers.q3)}
        </div>

        {/* Вопрос 4 */}
        <div className="question-block">
          <label className="question-label">
            <span className="required-star">*</span>4. Все ли было понятно в рассылке (дайджесте)?
          </label>
          {renderStars('q4', answers.q4)}
        </div>

        {/* Вопрос 5 */}
        <div className="question-block">
          <label className="question-label">
            <span className="required-star">*</span>5. Понятно ли бот пишет? Нет ощущения, что общаешься с роботом?
          </label>
          {renderStars('q5', answers.q5)}
        </div>

        {/* Вопрос 6 */}
        <div className="question-block">
          <label className="question-label">
            <span className="required-star">*</span>6. Достаточно ли подробно описаны события?
          </label>
          {renderStars('q6', answers.q6)}
        </div>

        {/* Вопрос 7 */}
        <div className="question-block">
          <label className="question-label">
            <span className="required-star">*</span>7. Как быстро бот отвечает? Не было ли зависаний?
          </label>
          {renderStars('q7', answers.q7)}
        </div>

        {/* Вопрос 8 */}
        <div className="question-block">
          <label className="question-label">
            <span className="required-star">*</span>8. Решил ли бот твою задачу? Нашел(ла) ли ты то, что искал(а)?
          </label>
          {renderStars('q8', answers.q8)}
        </div>

        {/* Вопрос 9 */}
        <div className="question-block">
          <label className="question-label">
            <span className="required-star">*</span>9. Понятно ли, как предложить своё событие (создать заявку)?
          </label>
          {renderStars('q9', answers.q9)}
        </div>

        {/* Вопрос 10 */}
        <div className="question-block">
          <label className="question-label">
            <span className="required-star">*</span>10. Пользовался(лась) ли ты функцией «Предложить мероприятие»?
          </label>
          <div className="boolean-section">
            <button 
              className={`boolean-btn ${answers.q10 === true ? 'active' : ''}`}
              onClick={() => handleBooleanChange(true)}
            >
              Да 
            </button>
            <button 
              className={`boolean-btn ${answers.q10 === false ? 'active' : ''}`}
              onClick={() => handleBooleanChange(false)}
            >
              Нет 
            </button>
          </div>
        </div>

        {/* Вопрос 10_sub */}
        {answers.q10 === true && (
          <div className="question-block slide-down">
            <label className="question-label">
              <span className="required-star">*</span>Было ли понятно, для чего это нужно и кто его увидит?
            </label>
            <div className="boolean-section">
              <button 
                className={`boolean-btn ${answers.q10_sub === true ? 'active' : ''}`}
                onClick={() => handleBooleanSubChange(true)}
              >
                Да 
              </button>
              <button 
                className={`boolean-btn ${answers.q10_sub === false ? 'active' : ''}`}
                onClick={() => handleBooleanSubChange(false)}
              >
                Нет 
              </button>
            </div>
          </div>
        )}

        {/* Вопрос 11 */}
        <div className="question-block">
          <label className="question-label">
            <span className="required-star">*</span>11. Что хочется улучшить? Напиши свои идеи и замечания. 
          </label>
          <textarea
            className="feedback-textarea"
            rows={5}
            maxLength={2000}
            value={answers.q11}
            onChange={(e) => handleTextChange('q11', e.target.value)}
          />
          <div className="char-counter">
            {answers.q11.length} / 2000
          </div>
        </div>

        
        <div className="submit-section">
          <button 
            className="submit-btn"
            onClick={submitFeedback}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Отправка...' : 'Отправить'}
          </button>
        </div>
      </div>
    </div>
  );
}