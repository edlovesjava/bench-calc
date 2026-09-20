import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Field } from '../../src/ui-react/widgets/Field';

describe('Field', () => {
  it('renders a text input for a normal var', () => {
    render(
      <Field name="V" meta={{ unit: 'V', label: 'V (across R)' }}
        value="5" isTarget={false} onChange={vi.fn()} />
    );
    expect(screen.getByLabelText('V (across R)')).toHaveValue('5');
    expect(screen.getByText('V')).toBeInTheDocument();
  });

  it('disables the input and shows the computed display when it is the target', () => {
    render(
      <Field name="V" meta={{ unit: 'V', label: 'V (across R)' }}
        value="5" isTarget computedDisplay="5 V" onChange={vi.fn()} />
    );
    const input = screen.getByLabelText('V (across R)') as HTMLInputElement;
    expect(input).toBeDisabled();
    expect(input.value).toBe('5 V');
  });

  it('calls onChange with the field name and new text', () => {
    const onChange = vi.fn();
    render(
      <Field name="V" meta={{ unit: 'V', label: 'V (across R)' }}
        value="5" isTarget={false} onChange={onChange} />
    );
    fireEvent.change(screen.getByLabelText('V (across R)'), { target: { value: '7' } });
    expect(onChange).toHaveBeenCalledWith('V', '7');
  });

  it('shows a field error when one is given', () => {
    render(
      <Field name="V" meta={{ unit: 'V', label: 'V (across R)' }}
        value="5 A" isTarget={false} error="that is A, this field wants V" onChange={vi.fn()} />
    );
    expect(screen.getByText('that is A, this field wants V')).toBeInTheDocument();
  });

  it('renders a select for a mode var', () => {
    const onChange = vi.fn();
    render(
      <Field name="series" meta={{ unit: '', label: 'Series', kind: 'mode', options: ['E24', 'E12'] }}
        value="E24" isTarget={false} onChange={onChange} />
    );
    fireEvent.change(screen.getByLabelText('Series'), { target: { value: 'E12' } });
    expect(onChange).toHaveBeenCalledWith('series', 'E12');
  });
});
