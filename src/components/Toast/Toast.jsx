import './Toast.css';

export default function Toast({ message, action, duration = 1150, onDismiss }) {
  const outDelayMs = Math.max(duration - 250, 0);

  return (
    <div className="toast toast--top" style={{ '--toast-out-delay': `${outDelayMs}ms` }}>
      <span>{message}</span>
      {action && (
        <button
          className="toast__action"
          onClick={() => { action.onClick(); onDismiss?.(); }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
