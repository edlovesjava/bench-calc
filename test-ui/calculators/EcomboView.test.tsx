import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EcomboView } from '../../src/ui-react/calculators/EcomboView';

describe('EcomboView', () => {
  it('shows the best series pair and its circuit diagram', () => {
    render(<EcomboView />);
    expect(screen.getByText('4.7 kΩ', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByText('82 Ω', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Ra 4.7 kΩ in series with Rb 82 Ω/ })).toBeInTheDocument();
  });

  it('updates the circuit when topology changes', () => {
    render(<EcomboView />);
    fireEvent.change(screen.getByLabelText('Topology'), { target: { value: 'parallel' } });
    expect(screen.getByRole('img', { name: /Ra 75 kΩ in parallel with Rb 5.1 kΩ/ })).toBeInTheDocument();
  });

  it('withholds the circuit when the target is invalid', () => {
    render(<EcomboView />);
    fireEvent.change(screen.getByLabelText('Target resistance'), { target: { value: '0' } });
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
