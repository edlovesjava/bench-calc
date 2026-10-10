import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RegulatorView } from '../../src/ui-react/calculators/RegulatorView';

describe('RegulatorView', () => {
  it('solves P by default and shows Tj in the formula trace', () => {
    render(<RegulatorView />);
    expect(screen.getByText('640 mW', { selector: '.headline-value' })).toBeInTheDocument(); // (9-0.8-5)*0.2
    // Tj is derived-only (not the solved target), so it never appears in
    // ResultGrid — only inside FormulaTrace's combined "expr = value" text
    // node, hence a substring/regex match rather than an exact one.
    expect(screen.getByText(/57 °C/)).toBeInTheDocument();
  });

  it('warns when Tj passes Tjmax', () => {
    render(<RegulatorView />);
    fireEvent.change(screen.getByLabelText('Load current'), { target: { value: '0.7' } });
    expect(screen.getByText(/past 125/)).toBeInTheDocument();
  });

  it('has no nearest-standard-value block for any target', () => {
    render(<RegulatorView />);
    expect(screen.queryByText('Nearest standard value')).not.toBeInTheDocument();
  });
});
