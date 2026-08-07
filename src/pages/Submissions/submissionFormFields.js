import { CITIES, EVENT_TYPES, PARTICIPATION_TYPES, CATEGORIES } from '../../data/filters.js';

export const FORM_GROUPS = [
  { id: 'about', label: 'О событии', fields: ['title', 'event_type', 'track', 'participation_type'] },
  { id: 'when_where', label: 'Когда и где', fields: ['date_time', 'city', 'address'] },
  { id: 'details', label: 'Детали', fields: ['description', 'price', 'expected_attendees', 'event_url', 'registration_url', 'organizers', 'speakers'] },
  { id: 'contacts', label: 'Контакты', fields: ['contact_person', 'contact_telegram', 'contact_email', 'contact_website'] },
];

export const FIELD_DEFS = {
  title: { type: 'text', label: 'Название события', required: true, minLength: 3 },
  event_type: { type: 'multiselect', label: 'Тема', options: EVENT_TYPES, required: true },
  track: { type: 'multiselect', label: 'Формат', options: CATEGORIES, required: true },
  participation_type: { type: 'multiselect', label: 'Кого приглашаем', options: PARTICIPATION_TYPES, required: true },
  date_time: { type: 'datetime', label: 'Когда', required: true },
  city: { type: 'multiselect', label: 'Город', options: CITIES, required: true },
  address: { type: 'address', label: 'Адрес', required: false },
  description: { type: 'textarea', label: 'Описание', required: false },
  price: { type: 'price', label: 'Стоимость участия, ₽', required: false },
  expected_attendees: { type: 'number', label: 'Ожидаемое количество участников', required: false },
  event_url: { type: 'url', label: 'Ссылка на мероприятие', required: false },
  registration_url: { type: 'url', label: 'Ссылка для регистрации', required: false },
  organizers: { type: 'tags', label: 'Организаторы', required: false },
  speakers: { type: 'tags', label: 'Спикеры', required: false },
  contact_person: { type: 'text', label: 'ФИО', required: true, minLength: 2 },
  contact_telegram: { type: 'text', label: 'Telegram', required: false },
  contact_email: { type: 'email', label: 'Email', required: false },
  contact_website: { type: 'url', label: 'Сайт', required: false },
};

export const EMPTY_FORM_DATA = {
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
  contact_person: "",
};

const normalizeNames = (list) => (list || []).map((item) => (typeof item === 'string' ? item : item?.name || ''));

export function buildInitialFormData(initialValues) {
  if (!initialValues) return { ...EMPTY_FORM_DATA };
  return {
    ...EMPTY_FORM_DATA,
    event_type: initialValues.event_type || [],
    participation_type: initialValues.participation_type || [],
    title: initialValues.title || '',
    start_date: initialValues.start_date || '',
    end_date: initialValues.end_date || '',
    city: initialValues.city || [],
    track: initialValues.track || [],
    expected_attendees: initialValues.expected_attendees ? String(initialValues.expected_attendees) : '',
    description: initialValues.description || '',
    organizers: normalizeNames(initialValues.organizers),
    speakers: normalizeNames(initialValues.speakers),
    event_url: initialValues.event_url || '',
    price: initialValues.price !== null && initialValues.price !== undefined ? String(initialValues.price) : '',
    registration_url: initialValues.registration_url || '',
    address: initialValues.address || '',
    start_time: initialValues.start_time || '',
    end_time: initialValues.end_time || '',
    category_id: initialValues.category_id || 0,
    contact_website: initialValues.contact_website || '',
    contact_telegram: initialValues.contact_telegram || '',
    contact_email: initialValues.contact_email || '',
    contact_person: initialValues.contact_person || '',
  };
}

export function buildSubmissionPayload(formData) {
  return {
    event_type: Array.isArray(formData.event_type) ? formData.event_type : [formData.event_type],
    participation_type: Array.isArray(formData.participation_type) ? formData.participation_type : [formData.participation_type],
    title: formData.title,
    start_date: formData.start_date,
    end_date: formData.end_date,
    city: Array.isArray(formData.city) ? formData.city : [formData.city],
    track: Array.isArray(formData.track) ? formData.track : [formData.track],
    expected_attendees: parseInt(formData.expected_attendees) || 0,
    description: formData.description,
    organizers: formData.organizers.map((name) => ({ name, url: '' })),
    speakers: formData.speakers.length > 0 ? formData.speakers.map((name) => ({ name, url: '' })) : null,
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
    contact_person: formData.contact_person || null,
  };
}
