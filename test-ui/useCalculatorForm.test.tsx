import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCalculatorForm } from '../src/ui-react/hooks/useCalculatorForm';
import { ohm } from '../src/ui-react/calculators/definitions';

describe('useCalculatorForm', () => {
  it('starts from each var\'s declared default', () => {
    const { result } = renderHook(() => useCalculatorForm(ohm));
    expect(result.current.values.V).toBe('5');
    expect(result.current.values.R).toBe('100');
  });

  it('solves for the default target and exposes the result', () => {
    const { result } = renderHook(() => useCalculatorForm(ohm));
    expect(result.current.target).toBe('V');
    expect(result.current.result.values.V).toBeCloseTo(5, 6);
  });

  it('re-solves when a field changes', () => {
    const { result } = renderHook(() => useCalculatorForm(ohm));
    act(() => result.current.setField('R', '200'));
    expect(result.current.result.values.V).toBeCloseTo(10, 6);
  });

  it('re-solves for a different target', () => {
    const { result } = renderHook(() => useCalculatorForm(ohm));
    act(() => result.current.setTarget('R'));
    expect(result.current.target).toBe('R');
    expect(result.current.result.values.R).toBeCloseTo(100, 6);
  });

  it('exposes every closedForm key as a target option', () => {
    const { result } = renderHook(() => useCalculatorForm(ohm));
    expect(result.current.targetOptions.sort()).toEqual(['I', 'R', 'V']);
  });

  it('has no target options for a procedure-kind definition', async () => {
    const { eseries } = await import('../src/ui-react/calculators/definitions');
    const { result } = renderHook(() => useCalculatorForm(eseries));
    expect(result.current.targetOptions).toEqual([]);
    expect(result.current.target).toBeUndefined();
  });
});
