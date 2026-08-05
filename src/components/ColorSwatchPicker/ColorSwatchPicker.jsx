import './ColorSwatchPicker.css';

export default function ColorSwatchPicker({ colors, value, onChange }) {
  if (!colors || colors.length === 0) return null;

  return (
    <div className="color-swatch-picker">
      {colors.map((hex) => (
        <button
          key={hex}
          type="button"
          className={`color-swatch-picker__swatch ${hex === value ? 'color-swatch-picker__swatch--selected' : ''}`}
          style={{ background: hex }}
          aria-label={hex}
          aria-pressed={hex === value}
          onClick={() => onChange(hex)}
        />
      ))}
    </div>
  );
}
