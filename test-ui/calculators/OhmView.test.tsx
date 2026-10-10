// test-ui/calculators/OhmView.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OhmView } from '../../src/ui-react/calculators/OhmView';

describe('OhmView', () => {
  it('shows the default-solved headline for V', () => {
    render(<OhmView />);
    expect(screen.getByText('V', { selector: '.headline-label' })).toBeInTheDocument();
    expect(screen.getByText('5 V', { selector: '.headline-value' })).toBeInTheDocument(); // V = I*R = 50 mA * 100 ohm
  });

  it('re-solves when R changes', () => {
    render(<OhmView />);
    fireEvent.change(screen.getByLabelText('R'), { target: { value: '200' } });
    expect(screen.getByText('10 V', { selector: '.headline-value' })).toBeInTheDocument();
  });

  it('switches target and disables the newly-computed field', () => {
    render(<OhmView />);
    fireEvent.change(screen.getByLabelText('Solve for'), { target: { value: 'R' } });
    const rField = screen.getByLabelText('R') as HTMLInputElement;
    expect(rField).toBeDisabled();
  });

  it('shows a warn check when power exceeds the part rating', () => {
    render(<OhmView />);
    fireEvent.change(screen.getByLabelText('I (through R)'), { target: { value: '3' } });
    expect(screen.getByText(/Over the part rating/)).toBeInTheDocument();
  });
});
