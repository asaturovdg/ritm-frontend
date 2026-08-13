import { STATUS_FILTERS } from './submissionStatus.js';
import './SubmissionStatusFilter.css';

export default function SubmissionStatusFilter({ submissions, activeFilter, onChange }) {
  const countFor = (key) =>
    key === 'all' ? submissions.length : submissions.filter((s) => s.status === key).length;

  return (
    <div className="submission-filter">
      {STATUS_FILTERS.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          data-testid={`submission-filter-${key}`}
          className={`submission-filter__tab ${activeFilter === key ? 'active' : ''}`}
          onClick={() => onChange(key)}
        >
          {label} <span className="submission-filter__count">{countFor(key)}</span>
        </button>
      ))}
    </div>
  );
}
