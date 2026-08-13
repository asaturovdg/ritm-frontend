import { FORM_GROUPS } from './submissionFormFields.js';

export function isDateValid(dateString) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkDate = new Date(dateString);
  checkDate.setHours(0, 0, 0, 0);
  return checkDate >= today;
}

export function isTimeValid(startDate, endDate, startTime, endTime) {
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
}

export function isEndDateValid(startDate, endDate) {
  if (!startDate) return true;
  if (!endDate) return true;
  return new Date(endDate) >= new Date(startDate);
}

function validateDateTime(formData) {
  if (!formData.start_date) return 'Пожалуйста, укажите дату начала';
  if (!isDateValid(formData.start_date)) return 'Дата начала не может быть в прошлом';
  if (!formData.end_date) return 'Пожалуйста, укажите дату окончания';
  if (!isEndDateValid(formData.start_date, formData.end_date)) return 'Дата окончания не может быть раньше даты начала';
  if (!isTimeValid(formData.start_date, formData.end_date, formData.start_time, formData.end_time)) {
    if (formData.start_time) {
      const isToday = formData.start_date === new Date().toISOString().split('T')[0];
      if (isToday) return 'Время начала не может быть в прошлом';
      if (formData.end_time && formData.end_date) return 'Время окончания должно быть позже времени начала';
    }
  }
  return null;
}

export function validateField(fieldId, formData) {
  switch (fieldId) {
    case 'title':
      return (!formData.title || formData.title.length < 3)
        ? 'Пожалуйста, введите название события (минимум 3 символа)'
        : null;
    case 'event_type':
    case 'track':
    case 'participation_type':
    case 'city':
      return (!formData[fieldId] || formData[fieldId].length === 0)
        ? 'Пожалуйста, выберите хотя бы 1 вариант'
        : null;
    case 'date_time':
      return validateDateTime(formData);
    case 'address': {
      const hasPhysicalCity = (formData.city || []).some((city) => city !== 'Онлайн');
      if (hasPhysicalCity && (!formData.address || !formData.address.trim())) {
        return 'Для офлайн-мероприятия необходимо указать адрес';
      }
      return null;
    }
    case 'event_url':
    case 'registration_url': {
      const value = formData[fieldId];
      if (value && value.trim() !== '' && !value.startsWith('https://')) {
        return 'Ссылка должна начинаться с https://';
      }
      return null;
    }
    case 'contact_person':
      return (!formData.contact_person || formData.contact_person.trim().length < 2)
        ? 'Пожалуйста, укажите ФИО'
        : null;
    default:
      return null;
  }
}

export function validateGroup(groupId, formData) {
  const group = FORM_GROUPS.find((g) => g.id === groupId);
  const errors = {};
  group.fields.forEach((fieldId) => {
    const error = validateField(fieldId, formData);
    if (error) errors[fieldId] = error;
  });
  if (groupId === 'contacts') {
    const hasContact = formData.contact_website?.trim() || formData.contact_telegram?.trim() || formData.contact_email?.trim();
    if (!hasContact) {
      errors._group = 'Укажите хотя бы один способ связи: сайт, Telegram или email';
    }
  }
  return errors;
}
