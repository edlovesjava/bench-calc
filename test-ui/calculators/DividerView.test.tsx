import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DividerView } from '../../src/ui-react/calculators/DividerView';

describe('DividerView', () => {
  it('solves Vout by default', () => {
    render(<DividerView />);
    expect(screen.getByText('2.5 V', { selector: '.headline-value' })).toBeInTheDocument();
  });

  it('warns when RL is set below 10x Rsource', () => {
    render(<DividerView />);
    fireEvent.change(screen.getByLabelText('Load resistance'), { target: { value: '1000' } });
    expect(screen.getByText(/load is now part of the divider/)).toBeInTheDocument();
  });

  it('shows the nearest-standard-value picker when R1 is the target', () => {
    render(<DividerView />);
    fireEvent.change(screen.getByLabelText('Solve for'), { target: { value: 'R1' } });
    expect(screen.getByText('Nearest standard value')).toBeInTheDocument();
  });
});
