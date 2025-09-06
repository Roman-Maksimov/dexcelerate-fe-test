import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { usePrevious } from '../usePrevious';

describe('usePrevious', () => {
  it('should return undefined on first render', () => {
    const { result } = renderHook(() => usePrevious('initial value'));
    expect(result.current).toBeUndefined();
  });

  it('should return previous value on subsequent renders', () => {
    const { result, rerender } = renderHook(({ value }) => usePrevious(value), {
      initialProps: { value: 'first' },
    });

    expect(result.current).toBeUndefined();

    rerender({ value: 'second' });
    expect(result.current).toBe('first');

    rerender({ value: 'third' });
    expect(result.current).toBe('second');
  });

  it('should handle null and undefined values', () => {
    const { result, rerender } = renderHook(({ value }) => usePrevious(value), {
      initialProps: { value: null as string | null | undefined },
    });

    expect(result.current).toBeUndefined();

    rerender({ value: undefined });
    expect(result.current).toBe(null);

    rerender({ value: 'string' });
    expect(result.current).toBeUndefined();
  });

  it('should handle object values', () => {
    const obj1 = { id: 1, name: 'test' };
    const obj2 = { id: 2, name: 'test2' };

    const { result, rerender } = renderHook(({ value }) => usePrevious(value), {
      initialProps: { value: obj1 },
    });

    expect(result.current).toBeUndefined();

    rerender({ value: obj2 });
    expect(result.current).toBe(obj1);
  });

  it('should handle primitive values', () => {
    const { result, rerender } = renderHook(({ value }) => usePrevious(value), {
      initialProps: { value: 42 },
    });

    expect(result.current).toBeUndefined();

    rerender({ value: 100 });
    expect(result.current).toBe(42);

    rerender({ value: 0 });
    expect(result.current).toBe(100);
  });
});
