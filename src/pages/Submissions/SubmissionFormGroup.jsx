import SubmissionFormField from './SubmissionFormField.jsx';
import { FORM_GROUPS } from './submissionFormFields.js';
import './SubmissionFormGroup.css';

export default function SubmissionFormGroup({ groupId, formData, errors, onFieldChange, onDateTimeChange }) {
  const group = FORM_GROUPS.find((g) => g.id === groupId);
  return (
    <div className="submission-form-group">
      <h3 className="submission-form-group__title">{group.label}</h3>
      {group.fields.map((fieldId) => (
        <SubmissionFormField
          key={fieldId}
          fieldId={fieldId}
          formData={formData}
          error={errors[fieldId]}
          onFieldChange={onFieldChange}
          onDateTimeChange={onDateTimeChange}
        />
      ))}
      {errors._group && <p className="submission-form-group__error">{errors._group}</p>}
    </div>
  );
}
