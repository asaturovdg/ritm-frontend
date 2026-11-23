import { createElement, useId, useState } from 'react';
import { ArrowUpRight, Globe, MessageCircle, Send } from 'lucide-react';
import { describeContact, normalizeContact } from './contact.js';

const TYPES = {
  telegram: { name: 'Telegram', Icon: Send, label: 'Имя пользователя', placeholder: 'username', help: 'Введите ник или вставьте ссылку из Telegram.' },
  max: { name: 'MAX', Icon: MessageCircle, label: 'Ваш контакт в MAX', placeholder: 'Ссылка на ваш профиль', help: 'Скопируйте ссылку на свой профиль в MAX.' },
  web: { name: 'Сайт', Icon: Globe, label: 'Адрес сайта', placeholder: 'example.ru/contact', help: 'Можно вставить привычный адрес сайта.' },
};

export default function ContactField({ value, onChange, label, onLabelChange }) {
  const initial = describeContact(value);
  const [type, setType] = useState(initial.type);
  const [values, setValues] = useState({ telegram: '', max: '', web: '', [initial.type]: initial.value });
  const [error, setError] = useState('');
  const id = useId();
  const config = TYPES[type];
  const result = normalizeContact(type, values[type]);
  const preview = result.url ? describeContact(result.url) : null;
  const Icon = config.Icon;
  const update = (nextType, raw, compact = false) => {
    const next = normalizeContact(nextType, raw);
    const actualType = next.url ? next.type : nextType;
    setType(actualType);
    setValues(previous => ({ ...previous, [actualType]: compact && !next.error ? next.value : raw }));
    setError(next.error || '');
    onChange(next.error ? raw : next.url);
  };
  return <div className="community-contact">
    <div className="community-contact-types" role="group" aria-label="Способ связи">
      {Object.entries(TYPES).map(([key, { name, Icon: TypeIcon }]) => <button key={key} type="button" className="community-contact-type" aria-pressed={type === key} onClick={() => update(key, values[key], true)}>{createElement(TypeIcon, { size: 16, 'aria-hidden': true })}{name}</button>)}
    </div>
    <label htmlFor={id}>{config.label}</label>
    <div className="community-contact-input">
      {type === 'telegram' && <span aria-hidden="true">@</span>}
      <input id={id} value={values[type]} maxLength={2048} placeholder={config.placeholder} autoComplete="off" autoCapitalize="none" spellCheck={false} aria-invalid={Boolean(error)} aria-describedby={`${id}-help${error ? ` ${id}-error` : ''}`} onChange={e => update(type, e.target.value)} onBlur={() => {
        if (!result.error) setValues(previous => ({ ...previous, [type]: result.value }));
      }} onPaste={e => {
        const text = e.clipboardData.getData('text');
        if (text) { e.preventDefault(); update(type, text, true); }
      }} />
    </div>
    <p id={`${id}-help`} className="community-hint">{config.help}</p>
    {error && <p role="alert" id={`${id}-error`}>{error}</p>}
    {preview && <div className="community-contact-preview"><span className="community-contact-icon"><Icon size={18} aria-hidden="true" /></span><span><strong>{label || preview.action}</strong><small>{preview.display}</small></span><ArrowUpRight size={17} aria-hidden="true" /></div>}
    <details className="community-contact-label"><summary>Подпись кнопки</summary><label>Текст кнопки<input value={label || ''} placeholder={preview?.action || config.name} maxLength={80} onChange={e => onLabelChange(e.target.value)} /></label></details>
  </div>;
}
