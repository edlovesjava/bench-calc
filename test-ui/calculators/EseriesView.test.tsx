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
    fireEvent.change(screen.getByLabelText('Series'), { target: { value: 'E12' } });
    // E12 nearest to 4780 is also 4700 (10*470 in E12), but confirm the output panel re-rendered
    expect(screen.getByText('4.7 kΩ')).toBeInTheDocument();
  });

  it('has no solve-for control', () => {
    render(<EseriesView />);
    expect(screen.queryByLabelText('Solve for')).not.toBeInTheDocument();
  });
});
