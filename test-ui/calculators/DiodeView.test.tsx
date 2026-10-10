import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DiodeView } from '../../src/ui-react/calculators/DiodeView';

describe('DiodeView', () => {
  it('solves Vafter by default', () => {
    render(<DiodeView />);
    expect(screen.getByText('8.2 V', { selector: '.headline-value' })).toBeInTheDocument();
  });

  it('warns when If exceeds Irated', () => {
    render(<DiodeView />);
    fireEvent.change(screen.getByLabelText('Current'), { target: { value: '2' } });
    expect(screen.getByText(/over the part rating/)).toBeInTheDocument();
  });
});
