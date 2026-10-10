import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResultGrid } from '../../src/ui-react/widgets/ResultGrid';

describe('ResultGrid', () => {
  it('formats each value with its declared unit', () => {
    render(<ResultGrid
      values={{ V: 5, R: 100 }}
      vars={{ V: { unit: 'V', label: 'V' }, R: { unit: 'ohm', label: 'R' } }}
    />);
    expect(screen.getByText('V')).toBeInTheDocument();
    expect(screen.getByText('5 V')).toBeInTheDocument();
    expect(screen.getByText('100 Ω')).toBeInTheDocument();
  });

  it('skips mode-kind vars', () => {
    render(<ResultGrid
      values={{ t: 4780, series: 'E24' }}
      vars={{ t: { unit: 'ohm', label: 't' }, series: { unit: '', label: 'Series', kind: 'mode' } }}
    />);
    expect(screen.queryByText('series')).not.toBeInTheDocument();
  });
});
