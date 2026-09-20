import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CheckList } from '../../src/ui-react/widgets/CheckList';

describe('CheckList', () => {
  it('renders nothing when there are no checks', () => {
    const { container } = render(<CheckList checks={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders each triggered check with its level as a class', () => {
    render(<CheckList checks={[
      { when: 'x', level: 'warn', text: 'careful', triggered: true },
      { when: 'y', level: 'fail', text: 'nope', triggered: true },
    ]} />);
    expect(screen.getByText('careful')).toHaveClass('check', 'warn');
    expect(screen.getByText('nope')).toHaveClass('check', 'fail');
  });
});
