import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EseriesView } from '../../src/ui-react/calculators/EseriesView';

describe('EseriesView', () => {
  it('shows the nearest E24 value for the default target', () => {
    render(<EseriesView />);
    expect(screen.getByText('4.7 kΩ')).toBeInTheDocument();
  });

  it('switches series and recomputes', () => {
    render(<EseriesView />);
    // E12 nearest to 4780 is also 4700 (10*470 in E12), so the "nearest value"
    // readout alone can't tell E24 and E12 apart. bandLow genuinely differs
    // between them (E24 tolerance is 5%, E12 is 10%), so assert on that instead.
    expect(screen.getByText('4.46 kΩ')).toBeInTheDocument(); // E24 band low: eng(4700 * 0.95, 'ohm')
    fireEvent.change(screen.getByLabelText('Series'), { target: { value: 'E12' } });
    expect(screen.getByText('4.23 kΩ')).toBeInTheDocument(); // E12 band low: eng(4700 * 0.90, 'ohm')
  });

  it('has no solve-for control', () => {
    render(<EseriesView />);
    expect(screen.queryByLabelText('Solve for')).not.toBeInTheDocument();
  });
});
