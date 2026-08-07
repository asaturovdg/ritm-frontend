import { useState, useEffect } from "react";
import { useAuth } from "../../components/AuthContext.jsx";
import { useToast } from "../../components/Toast/ToastContext.jsx";
import "./Submissions.css";
import { CITIES, EVENT_TYPES, PARTICIPATION_TYPES, CATEGORIES } from "../../data/filters.js";
import backArr from "../../assets/icons/backArrow.svg";
import SubmissionsList from "./SubmissionsList.jsx";

export default function Submissions() {
  const { token, userId } = useAuth();
  const showToast = useToast();
  const [activeMainTab, setActiveMainTab] = useState('create');

  // Состояния для формы создания
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [error, setError] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  
  // Состояния для заявок
  const [submissions, setSubmissions] = useState([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [hasLoadedSubmissionsOnce, setHasLoadedSubmissionsOnce] = useState(false);

  const [formData, setFormData] = useState({
    event_type: [],
    participation_type: [],
    title: "",
    start_date: "",
    end_date: "",
    city: [],
    track: [],
    expected_attendees: "",
    description: "",
    organizers: [],
    speakers: [],
    event_url: "",
    price: "",
    registration_url: "",
    address: "",
    start_time: "",
    end_time: "",
    category_id: 0,
    contact_website: "",
    contact_telegram: "",
    contact_email: "",
    contact_person: ""
  });

  // Вопросы 
  const questions = [
    { id: "title", text: "*Как называется событие?", type: "text", minLength: 3, optional: false },
    { id: "participation_type", text: "*Кого хочешь пригласить на мероприятие?", type: "multiselect", options: PARTICIPATION_TYPES, optional: false },
    { id: "track", text: "Выбери формат мероприятия", type: "multiselect", options: CATEGORIES, optional: false },
    { id: "city", text: "*В каких городах проходит событие?", type: "multiselect", options: CITIES, optional: false },
    { id: "event_type", text: "*Какая основная тема мероприятия?", type: "multiselect", options: EVENT_TYPES, optional: false },
    { id: "date_time", text: "*Выбери дату :", type: "datetime", optional: false },
    { id: "expected_attendees", text: "Ожидаемое количество участников?", type: "number", optional: true },
    { id: "description", text: "Расскажите о событии", type: "textarea", maxLength: 2000, optional: true },
    
    { id: "organizers", text: "Организаторы:", type: "tags", optional: true },
    { id: "speakers", text: "Ключевые спикеры ", type: "tags", optional: true },
    { id: "event_url", text: "Ссылка на мероприятие", type: "url", optional: true },
    { id: "address", text: "Адрес проведения (обязательно для офлайн-мероприятий, для онлайн можно пропустить). Если у тебя еще нет площадки, то можешь написать 'Ищу площадку'", type: "address", optional: false },
    { id: "price", text: "Стоимость участия в рублях (введите 0 если бесплатно, или пропустите)", type: "price", optional: true },
    { id: "registration_url", text: "Ссылка для регистрации (если отличается от ссылки на мероприятие, или можно пропустить)", type: "url", optional: true },
    { id: "contacts", text: "*Контактные данные", type: "contacts", optional: false }
  ];

  const currentQuestion = questions[step];
  const [tempInput, setTempInput] = useState("");

  // Загрузка заявок пользователя
  const fetchUserSubmissions = async () => {
    if (!token || !userId) return;

    const silent = hasLoadedSubmissionsOnce;
    if (!silent) setIsLoadingSubmissions(true);
    try {
      const response = await fetch(`https://ritmevents.ru/api/v1/users/${userId}/submissions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setSubmissions(data);
        setHasLoadedSubmissionsOnce(true);
      } else {
        showToast('Не удалось загрузить заявки. Попробуйте ещё раз');
      }
    } catch {
      showToast('Не удалось загрузить заявки. Попробуйте ещё раз');
    } finally {
      if (!silent) setIsLoadingSubmissions(false);
    }
  };

  useEffect(() => {
    if (activeMainTab === 'mySubmissions' && token) {
      fetchUserSubmissions();
    }
  }, [activeMainTab, token]);

  const handleChange = (id, value) => {
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleMultiselect = (id, option) => {
    setFormData(prev => ({
      ...prev,
      [id]: prev[id].includes(option)
        ? prev[id].filter(item => item !== option)
        : [...prev[id], option]
    }));
  };

  const handleTags = (id, value, add = false) => {
    if (add && value.trim()) {
      setFormData(prev => ({
        ...prev,
        [id]: [...prev[id], value.trim()]
      }));
      setTempInput("");
    } else {
      setTempInput(value);
    }
  };

  const removeTag = (id, index) => {
    setFormData(prev => ({
      ...prev,
      [id]: prev[id].filter((_, i) => i !== index)
    }));
  };

  const handleDateTime = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (field === "start_date" && formData.end_date) {
      if (new Date(value) > new Date(formData.end_date)) {
        setFormData(prev => ({ ...prev, end_date: "" }));
        setError("Дата окончания не может быть раньше даты начала");
        setTimeout(() => setError(null), 3000);
      }
    }
    
    if (field === "start_time" && formData.end_time && formData.start_date === formData.end_date) {
      if (value >= formData.end_time) {
        setFormData(prev => ({ ...prev, end_time: "" }));
        setError("Время окончания должно быть позже времени начала");
        setTimeout(() => setError(null), 3000);
      }
    }
  };

  const isDateValid = (dateString) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(dateString);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate >= today;
  };

  const isTimeValid = (startDate, endDate, startTime, endTime) => {
    if (!startDate || !startTime) return true;
    const startDateTime = new Date(`${startDate}T${startTime}`);
    const today = new Date();
    const isToday = startDate === today.toISOString().split('T')[0];
    
    if (isToday && startDateTime < today) return false;
    if (endDate && endTime) {
      const endDateTime = new Date(`${endDate}T${endTime}`);
      if (endDateTime <= startDateTime) return false;
    }
    return true;
  };

  const isEndDateValid = (startDate, endDate) => {
    if (!startDate) return true;
    if (!endDate) return true;
    return new Date(endDate) >= new Date(startDate);
  };

  const validateStep = () => {
    const q = currentQuestion;

    if (q.id === "event_url") {
      if (formData.event_url && formData.event_url.trim() !== "") {
        if (!formData.event_url.startsWith('https://')) {
          setError("Ссылка должна начинаться с https://");
          return false;
        }
      }
      if (q.optional) {
        setError(null);
        return true;
      }
    }
    
    if (q.id === "registration_url") {
      if (formData.registration_url && formData.registration_url.trim() !== "") {
        if (!formData.registration_url.startsWith('https://')) {
          setError("Ссылка должна начинаться с https://");
          return false;
        }
      }
      if (q.optional) {
        setError(null);
        return true;
      }
    }

    if (q.optional) {
      return true;
    }
    
    if (q.type === "text" && (!formData[q.id] || formData[q.id].length < (q.minLength || 1))) {
      setError(`Пожалуйста, введите название события (минимум ${q.minLength || 3} символа)`);
      return false;
    }
    
    if (q.type === "multiselect" && formData[q.id].length === 0) {
      setError(`Пожалуйста, выберите хотя бы 1 вариант`);
      return false;
    }
    
    if (q.id === "description" && (!formData.description || formData.description.length < 20)) {
      setError("Пожалуйста, напишите описание события (минимум 20 символов)");
      return false;
    }
    
    if (q.id === "organizers" && formData.organizers.length === 0) {
      setError("Пожалуйста, укажите хотя бы одного организатора");
      return false;
    }
    
    if (q.id === "date_time") {
      if (!formData.start_date) {
        setError("Пожалуйста, укажите дату начала");
        return false;
      }
      
      if (!isDateValid(formData.start_date)) {
        setError("Дата начала не может быть в прошлом");
        return false;
      }
      
      if (!formData.end_date) {
        setError("Пожалуйста, укажите дату окончания");
        return false;
      }

      if (formData.end_date && !isEndDateValid(formData.start_date, formData.end_date)) {
        setError("Дата окончания не может быть раньше даты начала");
        return false;
      }
      
      if (!isTimeValid(formData.start_date, formData.end_date, formData.start_time, formData.end_time)) {
        if (formData.start_time) {
          const isToday = formData.start_date === new Date().toISOString().split('T')[0];
          if (isToday) {
            setError("Время начала не может быть в прошлом");
          } else if (formData.end_time && formData.end_date) {
            setError("Время окончания должно быть позже времени начала");
          }
        }
        return false;
      }
    }
    
    if (q.id === "expected_attendees") {
      const attendees = parseInt(formData.expected_attendees);
      if (!attendees || attendees <= 0) {
        setError("Пожалуйста, укажите ожидаемое количество участников");
        return false;
      }
      if (attendees > 1000) {
        setError("Максимальное количество участников - 1000");
        return false;
      }
    }

    if (q.id === "address") {
      const hasPhysicalCity = formData.city.some(city => city !== "Онлайн");
      if (hasPhysicalCity && (!formData.address || !formData.address.trim())) {
        setError("Для офлайн-мероприятия необходимо указать адрес");
        return false;
      }
    }
    
    if (q.id === "contacts") {
      if (!formData.contact_person || formData.contact_person.trim().length < 2) {
        setError("Пожалуйста, укажите ФИО");
        return false;
      }
      const hasContact = formData.contact_website?.trim() || 
                        formData.contact_telegram?.trim() || 
                        formData.contact_email?.trim();
      if (!hasContact) {
        setError("Укажите хотя бы один способ связи: сайт, Telegram или email");
        return false;
      }
      setError(null);
      return true;
    }


    setError(null);
    return true;
  };

  const nextStep = () => {
    if (validateStep()) {
      if (step < questions.length - 1) {
        setStep(step + 1);
      } else {
        setShowPreview(true);
      }
    }
  };

  const prevStep = () => {
    if (step > 0) {
      setStep(step - 1);
      setError(null);
    }
  };

  const submitForm = async () => {
    if (!token) {
      setError("Требуется авторизация");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        event_type: Array.isArray(formData.event_type) ? formData.event_type : [formData.event_type],
        participation_type: Array.isArray(formData.participation_type) 
          ? formData.participation_type  
          : [formData.participation_type],
        title: formData.title,
        start_date: formData.start_date,
        end_date: formData.end_date, 
        city: Array.isArray(formData.city) ? formData.city : [formData.city],
        track: Array.isArray(formData.track) ? formData.track : [formData.track],      
        expected_attendees: parseInt(formData.expected_attendees) || 0,
        description: formData.description,
        organizers: formData.organizers.map(name => ({ name, url: "" })),
        speakers: formData.speakers.length > 0 ? formData.speakers.map(name => ({ name, url: "" })) : null,
        event_url: formData.event_url || null,
        price: formData.price ? Math.max(0, parseInt(formData.price)) : null,
        registration_url: formData.registration_url || null,
        address: formData.address || null,
        start_time: formData.start_time || null,  
        end_time: formData.end_time || null,
        category_id: formData.category_id || null,
        contact_website: formData.contact_website || null,
        contact_telegram: formData.contact_telegram || null,
        contact_email: formData.contact_email || null,
        contact_person: formData.contact_person || null
      };

      const response = await fetch('https://ritmevents.ru/api/v1/submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setIsCompleted(true);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail?.[0]?.msg || "Ошибка отправки");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      event_type: [],
      participation_type: [],
      title: "",
      start_date: "",
      end_date: "",
      city: [],
      track: [],
      expected_attendees: "",
      description: "",
      organizers: [],
      speakers: [],
      event_url: "",
      price: "",
      registration_url: "",
      address: "",
      start_time: "",
      end_time: "",
      category_id: 0,
      contact_website: "",
      contact_telegram: "",
      contact_email: "",
      contact_person: ""
    });
    setStep(0);
    setShowPreview(false);
    setIsCompleted(false);
    setError(null);
  };

  if (isCompleted && activeMainTab === 'create') {
    return (
      <div className="submissions-container">
        <div className="completed-screen">
          <div className="completion-card">
            
            <h2>Заявка отправлена!</h2>
            <button onClick={() => {
              resetForm();
              setActiveMainTab('mySubmissions');
              fetchUserSubmissions();
            }} className="submit-btn">
              Посмотреть мои заявки
            </button>
            <button onClick={resetForm} className="reset-filters__btn" style={{ marginTop: '10px' }}>
              Предложить ещё событие
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="submissions-container">
      <div className="profileTabs">
        <button
          className={`profile-tab ${activeMainTab === 'create' ? 'active' : ''}`}
          onClick={() => {
            setActiveMainTab('create');
            resetForm();
          }}
        >
          Создать событие
        </button>
        <button
          className={`profile-tab ${activeMainTab === 'mySubmissions' ? 'active' : ''}`}
          onClick={() => setActiveMainTab('mySubmissions')}
        >
          Мои заявки
        </button>
      </div>

      {activeMainTab === 'create' && (
        <>
          {!showPreview ? (
            <>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${((step + 1) / questions.length) * 100}%` }} />
                <span className="progress-text">Вопрос {step + 1} из {questions.length}</span>
              </div>

                <div className="question-card">
    <h2 className="question-title">{currentQuestion.text}</h2>
    
    {error && <div className="error-message">{error}</div>}

    {currentQuestion.type === "text" && (
      <input
        type="text"
        className="question-input"
        value={formData[currentQuestion.id]}
        onChange={(e) => handleChange(currentQuestion.id, e.target.value)}
      />
    )}

    {currentQuestion.type === "multiselect" && (
      <div className="chips-container">
        {currentQuestion.options.map(opt => (
          <span
            key={opt}
            className={`chip ${formData[currentQuestion.id]?.includes(opt) ? "active" : ""}`}
            onClick={() => handleMultiselect(currentQuestion.id, opt)}
          >
            {opt}
          </span>
        ))}
      </div>
    )}

    {currentQuestion.type === "datetime" && (
      <div className="datetime-group">
        <div className="form-row">
          <div className="form-group">
            <label>Дата начала *</label>
            <input type="date" value={formData.start_date} onChange={(e) => handleDateTime("start_date", e.target.value)} />
          </div>
          <div className="form-group">
            <label>Время начала</label>
            <input type="time" value={formData.start_time} onChange={(e) => handleDateTime("start_time", e.target.value)} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Дата окончания *</label>
            <input type="date" value={formData.end_date} onChange={(e) => handleDateTime("end_date", e.target.value)} />
          </div>
          <div className="form-group">
            <label>Время окончания</label>
            <input type="time" value={formData.end_time} onChange={(e) => handleDateTime("end_time", e.target.value)} />
          </div>
        </div>
        {(formData.start_date && !formData.end_date) && (
          <p className="error-hint">Пожалуйста, укажите дату окончания</p>
        )}
      </div>
    )}

    {currentQuestion.type === "textarea" && (
      <textarea
        className="question-textarea"
        rows={6}
        maxLength={currentQuestion.maxLength}
        value={formData[currentQuestion.id]}
        onChange={(e) => handleChange(currentQuestion.id, e.target.value)}
      />
    )}

    {currentQuestion.type === "number" && (
      <div>
        <input
          type="number"
          className="question-input"
          value={formData[currentQuestion.id]}
          onChange={(e) => {
            const val = parseInt(e.target.value);
            if (val <= 1000 || !e.target.value) {
              handleChange(currentQuestion.id, e.target.value);
            }
          }}
          min="1"
          max="1000"
        />
        {parseInt(formData[currentQuestion.id]) > 1000 && (
          <p className="error-hint">Максимальное количество участников - 1000</p>
        )}
      </div>
    )}

    {currentQuestion.type === "url" && (
      <input
        type="url"
        className="question-input"
        placeholder="https://"
        value={formData[currentQuestion.id] || ""}
        onChange={(e) => handleChange(currentQuestion.id, e.target.value)}
      />
    )}

    {currentQuestion.type === "price" && (
      <div>
        <input
          type="number"
          className="question-input"
          value={formData[currentQuestion.id]}
          onChange={(e) => {
            const value = e.target.value;
            if (value === '' || parseFloat(value) >= 0) {
              handleChange(currentQuestion.id, value);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === '-' || e.key === 'Minus') {
              e.preventDefault();
            }
          }}
          min="0"
          step="1"
        />
        {formData[currentQuestion.id] && parseFloat(formData[currentQuestion.id]) < 0 && (
          <p className="error-hint">Цена не может быть отрицательной</p>
        )}
      </div>
    )}

    {currentQuestion.type === "address" && (
      <textarea
        className="question-textarea"
        rows={3}
        value={formData.address}
        onChange={(e) => handleChange("address", e.target.value)}
      />
    )}

    {currentQuestion.type === "tags" && (
      <div className="tags-group">
        <div className="tags-list">
          {formData[currentQuestion.id].map((tag, idx) => (
            <span key={idx} className="tag">
              {tag}
              <button className="tag-remove" onClick={() => removeTag(currentQuestion.id, idx)}>×</button>
            </span>
          ))}
        </div>
        <div className="tag-input-group">
          <input
            type="text"
            className="tag-input"
            value={tempInput}
            onChange={(e) => setTempInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter" && tempInput.trim()) {
                handleTags(currentQuestion.id, tempInput, true);
              }
            }}
          />
          <button className="add-tag-btn" onClick={() => handleTags(currentQuestion.id, tempInput, true)}>
            Добавить
          </button>
        </div>
      </div>
    )}

    
    {currentQuestion.type === "contacts" && (
  <div className="contacts-group">
    <div className="contact-field">
      <label>* ФИО </label>
      <input
        type="text"
        className="question-input"
        
        value={formData.contact_person}
        onChange={(e) => {
          const value = e.target.value;
          // Только буквы, пробелы, дефисы и точка
          if (/^[а-яА-Яa-zA-Z\s\-\.]*$/.test(value)) {
            handleChange("contact_person", value);
            setError(null);
          }
        }}
      />
      {formData.contact_person && formData.contact_person.trim().length < 3 && (
        <p className="error-hint">Введите корректное ФИО (минимум 3 символа)</p>
      )}
    </div>

    <p className="contact-hint">* Укажите хотя бы один способ связи:</p>

    <div className="contact-field">
      <label>Telegram</label>
      <input
        type="text"
        className="question-input"
        placeholder="@username"
        value={formData.contact_telegram}
        onChange={(e) => {
          let value = e.target.value;
          // Убираем пробелы и приводим к нижнему регистру
          value = value.replace(/\s/g, '');
          if (!value.startsWith('@')) {
            value = value;
          }
          handleChange("contact_telegram", value);
          setError(null);
        }}
      />
      {formData.contact_telegram && !/^@?[a-zA-Z0-9_]{5,32}$/.test(formData.contact_telegram.replace('@', '')) && (
        <p className="error-hint">Неверный формат Telegram</p>
      )}
    </div>

    <div className="contact-field">
      <label>Email</label>
      <input
        type="email"
        className="question-input"
        placeholder="me@mail.ru"
        value={formData.contact_email}
        onChange={(e) => {
          const value = e.target.value.toLowerCase();
          handleChange("contact_email", value);
          setError(null);
        }}
      />
      {formData.contact_email && !/^[^\s@]+@([^\s@.,]+\.)+[^\s@.,]{2,}$/.test(formData.contact_email) && (
        <p className="error-hint">Неверный формат email</p>
      )}
    </div>

    <div className="contact-field">
      <label>Сайт</label>
      <input
        type="url"
        className="question-input"
        placeholder="https://sber.ru"
        value={formData.contact_website}
        onChange={(e) => {
          let value = e.target.value;
          
          if (value && !value.startsWith('http://') && !value.startsWith('https://') && value.includes('.')) {
            value = `https://${value}`;
          }
          handleChange("contact_website", value);
          setError(null);
        }}
      />
      {formData.contact_website && !/^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)$/.test(formData.contact_website) && (
        <p className="error-hint">Неверный формат ссылки</p>
      )}
    </div>
  </div>
)}
                <div className="question-nav">
                    {step > 0 && (
                      <button className="back-btn" onClick={prevStep}>
                        <img src={backArr} alt="back" />
                      </button>
                    )}
                    <button className="next-btn" onClick={nextStep}>
                      {step === questions.length - 1 ? "Посмотреть событие" : "Далее"}
                    </button>
                  </div>
                </div>
              
            </>
          ) : (
            <div className="submissions-preview">
              <h2>Предпросмотр события</h2>
              <div className="preview-card">
                <h1>{formData.title || "—"}</h1>
                <div className="preview-section"><strong>Формат:</strong> {formData.track?.join(', ') || "—"}</div>
                <div className="preview-section"><strong>Кого приглашаем:</strong> {formData.participation_type?.join(', ') || "—"}</div>
                <div className="preview-section"><strong>Города:</strong> {formData.city?.join(", ") || "—"}</div>
                <div className="preview-section"><strong>Тема:</strong> {formData.event_type?.join(", ") || "—"}</div>
                <div className="preview-section"><strong>Дата и время:</strong> {formData.start_date} {formData.start_time}</div>
                <div className="preview-section"><strong>Описание:</strong> <p>{formData.description || "—"}</p></div>
              </div>
              <div className="preview-actions">
                <button className="back-btn" onClick={() => setShowPreview(false)}>Редактировать</button>
                <button className="submit-btn" onClick={submitForm} disabled={isSubmitting}>
                  {isSubmitting ? "Отправка..." : "Отправить на проверку"}
                </button>
              </div>
            </div>
          )}
        </>
      )}
      

      {activeMainTab === 'mySubmissions' && (
        <SubmissionsList
          submissions={submissions}
          isLoading={isLoadingSubmissions}
          hasLoadedOnce={hasLoadedSubmissionsOnce}
          token={token}
          userId={userId}
          onRefetch={fetchUserSubmissions}
          onCreateNew={() => setActiveMainTab('create')}
        />
      )}
    </div>
  );
}