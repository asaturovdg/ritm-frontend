import { useState } from 'react';
import { useToast } from '../../components/Toast/ToastContext.jsx';
import SubmissionFormGroup from './SubmissionFormGroup.jsx';
import { FORM_GROUPS, buildInitialFormData, buildSubmissionPayload } from './submissionFormFields.js';
import { validateGroup } from './submissionFormValidation.js';
import './SubmissionForm.css';

export default function SubmissionForm({ mode = 'create', editingId = null, initialValues = null, token, onDone }) {
  const showToast = useToast();
  const [groupIndex, setGroupIndex] = useState(0);
  const [formData, setFormData] = useState(() => buildInitialFormData(initialValues));
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const group = FORM_GROUPS[groupIndex];
  const isLastGroup = groupIndex === FORM_GROUPS.length - 1;

  const handleFieldChange = (fieldId, value) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleDateTimeChange = (patch) => {
    setFormData((prev) => ({ ...prev, ...patch }));
  };

  const submit = async () => {
    setIsSubmitting(true);
    const failMessage = mode === 'edit'
      ? 'Не удалось сохранить заявку. Попробуйте ещё раз'
      : 'Не удалось отправить заявку. Попробуйте ещё раз';
    try {
      const payload = buildSubmissionPayload(formData);
      const url = mode === 'edit'
        ? `https://ritmevents.ru/api/v1/submissions/${editingId}`
        : 'https://ritmevents.ru/api/v1/submissions';
      const response = await fetch(url, {
        method: mode === 'edit' ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        onDone(mode);
      } else {
        showToast(failMessage);
      }
    } catch {
      showToast(failMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const goNext = () => {
    const groupErrors = validateGroup(group.id, formData);
    if (Object.keys(groupErrors).length > 0) {
      setErrors(groupErrors);
      return;
    }
    setErrors({});
    if (isLastGroup) {
      submit();
    } else {
      setGroupIndex((i) => i + 1);
    }
  };

  const goBack = () => {
    if (groupIndex > 0) {
      setErrors({});
      setGroupIndex((i) => i - 1);
    }
  };

  const nextLabel = isLastGroup ? (mode === 'edit' ? 'Сохранить' : 'Отправить на проверку') : 'Далее';

  return (
    <div className="submission-form">
      <div className="submission-form__progress">
        <div className="submission-form__progress-bar">
          {FORM_GROUPS.map((g, i) => (
            <div key={g.id} className={`submission-form__progress-segment ${i <= groupIndex ? 'filled' : ''}`} />
          ))}
        </div>
        <span className="submission-form__progress-text">Шаг {groupIndex + 1} из {FORM_GROUPS.length}</span>
      </div>

      <SubmissionFormGroup
        groupId={group.id}
        formData={formData}
        errors={errors}
        onFieldChange={handleFieldChange}
        onDateTimeChange={handleDateTimeChange}
      />

      <div className="submission-form__nav">
        <button
          type="button"
          className="submission-form__nav-btn submission-form__nav-btn--secondary"
          disabled={groupIndex === 0}
          onClick={goBack}
        >
          Назад
        </button>
        <button
          type="button"
          className="submission-form__nav-btn submission-form__nav-btn--primary"
          disabled={isSubmitting}
          onClick={goNext}
        >
          {isSubmitting ? 'Отправка…' : nextLabel}
        </button>
      </div>
    </div>
  );
}
