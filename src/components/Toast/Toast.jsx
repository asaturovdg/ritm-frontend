import './Toast.css';

export default function Toast({ message }) {
  return (
    <div className="toast toast--top">
      {message}
    </div>
  );
}
