// test-ui/calculators/LedResistorView.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LedResistorView } from '../../src/ui-react/calculators/LedResistorView';

describe('LedResistorView', () => {
  it('solves R by default from Vs, Vf, If', () => {
    render(<LedResistorView />);
    expect(screen.getByText('1 kΩ', { selector: '.headline-value' })).toBeInTheDocument(); // (5-2)/3mA = 1k
  });

  it('shows the Vf preset picker and applies a preset', () => {
    render(<LedResistorView />);
    fireEvent.change(screen.getByLabelText('Quick LED Vf preset'), { target: { value: '3.2' } });
    expect(screen.getByLabelText('LED Vf')).toHaveValue('3.2');
  });

  it('shows the fail check when Vf is at or above the rail', () => {
    render(<LedResistorView />);
    fireEvent.change(screen.getByLabelText('LED Vf'), { target: { value: '9' } });
    expect(screen.getByText(/nothing lights/)).toBeInTheDocument();
    expect(screen.getByText(/nothing lights/)).toHaveClass('fail');
  });
});
