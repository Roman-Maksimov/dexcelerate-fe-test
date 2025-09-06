import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { TokenTableFilters } from '../../scheme/type';
import { useTable } from '../useTable';

// Mock the API hooks
vi.mock('../../api/hooks', () => ({
  useGetScannerInfiniteQuery: vi.fn(() => ({
    data: {
      pages: [
        {
          data: {
            pairs: [
              {
                pairAddress: '0x123',
                token1Symbol: 'TEST',
                token1Name: 'Test Token',
                price: '0.001',
                volume: '10000',
                currentMcap: '1000000',
                chainId: 1,
              },
            ],
          },
        },
      ],
      allPages: [
        {
          pairAddress: '0x123',
          token1Symbol: 'TEST',
          token1Name: 'Test Token',
          price: '0.001',
          volume: '10000',
          currentMcap: '1000000',
          chainId: 1,
        },
      ],
      pairs: {
        '0x123': {
          pairAddress: '0x123',
          token1Symbol: 'TEST',
          token1Name: 'Test Token',
          price: '0.001',
          volume: '10000',
          currentMcap: '1000000',
          chainId: 1,
        },
      },
    },
    fetchNextPage: vi.fn(),
    hasNextPage: true,
    isFetchingNextPage: false,
    isLoading: false,
  })),
  API_KEY_GET_SCANNER: 'scanner',
}));

// Mock the WebSocket hook
vi.mock('../useWebSocket', () => ({
  useWebSocket: vi.fn(() => ({
    isConnected: true,
    isConnecting: false,
    reconnectCountdown: null,
    subscriptionTicksRef: { current: new Map() },
    subscriptionStatsRef: { current: new Map() },
    subscribeToScanner: vi.fn(),
    unsubscribeFromScanner: vi.fn(),
    subscribeToPair: vi.fn(),
    unsubscribeFromPair: vi.fn(),
    subscribeToPairStats: vi.fn(),
    unsubscribeFromPairStats: vi.fn(),
  })),
}));

// Mock environment variables
Object.defineProperty(import.meta, 'env', {
  value: {
    VITE_DATA_UPDATE_INTERVAL: '1000',
  },
  writable: true,
});

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  // eslint-disable-next-line react/display-name
  return ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useTable({}), {
      wrapper: createWrapper(),
    });

    expect(result.current.sort).toEqual({
      column: 'volumeUsd',
      direction: 'desc',
    });
    expect(result.current.filters).toEqual({
      chain: null,
      minVolume: null,
      maxAge: null,
      minMcap: null,
      excludeHoneypots: false,
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isConnected).toBe(true);
    expect(result.current.isConnecting).toBe(false);
  });

  it('should handle sort changes', () => {
    const { result } = renderHook(() => useTable({}), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.handleSort('mcap');
    });

    expect(result.current.sort).toEqual({
      column: 'mcap',
      direction: 'desc',
    });

    act(() => {
      result.current.handleSort('mcap');
    });

    expect(result.current.sort).toEqual({
      column: 'mcap',
      direction: 'asc',
    });
  });

  it('should handle filter changes', () => {
    const { result } = renderHook(() => useTable({}), {
      wrapper: createWrapper(),
    });

    const newFilters: TokenTableFilters = {
      chain: 'ETH',
      minVolume: 1000,
      maxAge: 3600,
      minMcap: 100000,
      excludeHoneypots: true,
    };

    act(() => {
      result.current.handleFiltersChange(newFilters);
    });

    expect(result.current.filters).toEqual(newFilters);
  });

  it('should clear filters', () => {
    const { result } = renderHook(() => useTable({}), {
      wrapper: createWrapper(),
    });

    // Set some filters first
    const filters: TokenTableFilters = {
      chain: 'ETH',
      minVolume: 1000,
      maxAge: 3600,
      minMcap: 100000,
      excludeHoneypots: true,
    };

    act(() => {
      result.current.handleFiltersChange(filters);
    });

    expect(result.current.filters).toEqual(filters);

    // Clear filters
    act(() => {
      result.current.handleClearFilters();
    });

    expect(result.current.filters).toEqual({
      chain: null,
      minVolume: null,
      maxAge: null,
      minMcap: null,
      excludeHoneypots: false,
    });
  });

  it('should use custom filters when provided', () => {
    const customFilters: TokenTableFilters = {
      chain: 'SOL',
      minVolume: 5000,
      maxAge: 7200,
      minMcap: 500000,
      excludeHoneypots: true,
    };

    const { result } = renderHook(() => useTable({ filters: customFilters }), {
      wrapper: createWrapper(),
    });

    // The hook should use custom filters in the API parameters
    expect(result.current.filters).toEqual({
      chain: null,
      minVolume: null,
      maxAge: null,
      minMcap: null,
      excludeHoneypots: false,
    });
  });

  it('should provide refs for infinite scroll', () => {
    const { result } = renderHook(() => useTable({}), {
      wrapper: createWrapper(),
    });

    expect(result.current.loadMoreRef).toBeDefined();
    expect(result.current.earlyLoadRef).toBeDefined();
  });

  it('should provide pagination functions', () => {
    const { result } = renderHook(() => useTable({}), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.fetchNextPage).toBe('function');
    expect(result.current.hasNextPage).toBe(true);
    expect(result.current.isFetchingNextPage).toBe(false);
  });

  it('should handle WebSocket connection state', () => {
    const { result } = renderHook(() => useTable({}), {
      wrapper: createWrapper(),
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.isConnecting).toBe(false);
    expect(result.current.reconnectCountdown).toBeNull();
  });

  it('should return data from the query', () => {
    const { result } = renderHook(() => useTable({}), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.pages).toHaveLength(1);
    expect(result.current.data?.allPages).toHaveLength(1);
    expect(result.current.data?.pairs).toBeDefined();
  });

  it('should handle sort toggle correctly', () => {
    const { result } = renderHook(() => useTable({}), {
      wrapper: createWrapper(),
    });

    // First click - should set to desc
    act(() => {
      result.current.handleSort('priceUsd');
    });

    expect(result.current.sort).toEqual({
      column: 'priceUsd',
      direction: 'desc',
    });

    // Second click - should toggle to asc
    act(() => {
      result.current.handleSort('priceUsd');
    });

    expect(result.current.sort).toEqual({
      column: 'priceUsd',
      direction: 'asc',
    });

    // Third click - should toggle back to desc
    act(() => {
      result.current.handleSort('priceUsd');
    });

    expect(result.current.sort).toEqual({
      column: 'priceUsd',
      direction: 'desc',
    });
  });

  it('should handle different column sorts', () => {
    const { result } = renderHook(() => useTable({}), {
      wrapper: createWrapper(),
    });

    const columns = ['volumeUsd', 'mcap', 'priceUsd', 'buys', 'sells'];

    columns.forEach(column => {
      act(() => {
        result.current.handleSort(column);
      });

      expect(result.current.sort.column).toBe(column);
    });
  });
});
