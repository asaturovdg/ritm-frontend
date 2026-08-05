import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ColorSwatchPicker from '../ColorSwatchPicker.jsx';

describe('ColorSwatchPicker', () => {
  const colors = ['#FF0000', '#00FF00', '#0000FF'];

  it('renders one swatch button per color', () => {
    render(<ColorSwatchPicker colors={colors} value="#FF0000" onChange={vi.fn()} />);
    expect(screen.getAllByRole('button')).toHaveLength(3);
  });

  it('marks the swatch matching value as selected', () => {
    render(<ColorSwatchPicker colors={colors} value="#00FF00" onChange={vi.fn()} />);
    expect(screen.getByLabelText('#00FF00')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('#FF0000')).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onChange with the clicked hex', () => {
    const onChange = vi.fn();
    render(<ColorSwatchPicker colors={colors} value="#FF0000" onChange={onChange} />);
    screen.getByLabelText('#0000FF').click();
    expect(onChange).toHaveBeenCalledWith('#0000FF');
  });

  it('renders nothing when colors is empty', () => {
    const { container } = render(<ColorSwatchPicker colors={[]} value="" onChange={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
