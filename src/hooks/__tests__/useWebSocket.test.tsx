import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useWebSocket } from '../useWebSocket';

// Mock WebSocket
const mockWebSocket = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
  readyState: 0,
  onopen: null as ((event: Event) => void) | null,
  onclose: null as ((event: CloseEvent) => void) | null,
  onerror: null as ((event: Event) => void) | null,
  onmessage: null as ((event: MessageEvent) => void) | null,
  send: vi.fn(),
  close: vi.fn(),
};

// Mock global WebSocket
// @ts-expect-error mock
global.WebSocket = vi.fn(() => mockWebSocket);

// Mock environment variables
Object.defineProperty(import.meta, 'env', {
  value: {
    VITE_WS_URL: 'wss://api-rs.dexcelerate.com/ws',
  },
  writable: true,
});

describe('useWebSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWebSocket.readyState = 0;
    mockWebSocket.onopen = null;
    mockWebSocket.onclose = null;
    mockWebSocket.onerror = null;
    mockWebSocket.onmessage = null;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with connecting state', () => {
    const { result } = renderHook(() => useWebSocket({}));

    expect(result.current.isConnected).toBe(false);
    expect(result.current.isConnecting).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.reconnectCountdown).toBeNull();
  });

  it('should connect to WebSocket on mount', () => {
    renderHook(() => useWebSocket({}));

    expect(global.WebSocket).toHaveBeenCalledWith(
      'wss://api-rs.dexcelerate.com/ws'
    );
  });

  it('should handle successful connection', () => {
    const { result } = renderHook(() => useWebSocket({}));

    act(() => {
      mockWebSocket.readyState = 1;
      mockWebSocket.onopen?.(new Event('open'));
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.isConnecting).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should handle connection error', () => {
    const { result } = renderHook(() => useWebSocket({}));

    act(() => {
      mockWebSocket.onerror?.(new Event('error'));
    });

    expect(result.current.error).toBe('WebSocket connection error');
  });

  it('should handle connection close', () => {
    const { result } = renderHook(() => useWebSocket({}));

    act(() => {
      mockWebSocket.readyState = 3;
      mockWebSocket.onclose?.(new CloseEvent('close', { code: 1006 }));
    });

    expect(result.current.isConnected).toBe(false);
  });

  it('should provide subscription functions', () => {
    const { result } = renderHook(() => useWebSocket({}));

    expect(typeof result.current.subscribeToScanner).toBe('function');
    expect(typeof result.current.unsubscribeFromScanner).toBe('function');
    expect(typeof result.current.subscribeToPair).toBe('function');
    expect(typeof result.current.unsubscribeFromPair).toBe('function');
    expect(typeof result.current.subscribeToPairStats).toBe('function');
    expect(typeof result.current.unsubscribeFromPairStats).toBe('function');
  });

  it('should handle incoming messages', () => {
    const onScanner = vi.fn();
    const onTick = vi.fn();
    const onStats = vi.fn();

    renderHook(() => useWebSocket({ onScanner, onTick, onStats }));

    act(() => {
      mockWebSocket.readyState = 1;
      mockWebSocket.onopen?.(new Event('open'));
    });

    // Test scanner message
    const scannerMessage = {
      event: 'scanner-pairs',
      data: { filter: { chain: 'ETH' }, results: { pairs: [] } },
    };

    act(() => {
      mockWebSocket.onmessage?.(
        new MessageEvent('message', {
          data: JSON.stringify(scannerMessage),
        })
      );
    });

    expect(onScanner).toHaveBeenCalledWith(scannerMessage.data);

    // Test tick message
    const tickMessage = {
      event: 'tick',
      data: {
        pair: { pair: '0x123', token: '0x456', chain: 'ETH' },
        swaps: [],
      },
    };

    act(() => {
      mockWebSocket.onmessage?.(
        new MessageEvent('message', {
          data: JSON.stringify(tickMessage),
        })
      );
    });

    expect(onTick).toHaveBeenCalledWith(tickMessage.data);

    // Test stats message
    const statsMessage = {
      event: 'pair-stats',
      data: { pair: {}, pairStats: {}, migrationProgress: '50' },
    };

    act(() => {
      mockWebSocket.onmessage?.(
        new MessageEvent('message', {
          data: JSON.stringify(statsMessage),
        })
      );
    });

    expect(onStats).toHaveBeenCalledWith(statsMessage.data);
  });

  it('should handle invalid JSON messages', () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    renderHook(() => useWebSocket({}));

    act(() => {
      mockWebSocket.readyState = 1;
      mockWebSocket.onopen?.(new Event('open'));
    });

    act(() => {
      mockWebSocket.onmessage?.(
        new MessageEvent('message', {
          data: 'invalid json',
        })
      );
    });

    expect(consoleError).toHaveBeenCalledWith(
      'Failed to parse WebSocket message:',
      expect.any(Error)
    );

    consoleError.mockRestore();
  });

  it('should handle manual disconnect', () => {
    const { result } = renderHook(() => useWebSocket({}));

    act(() => {
      mockWebSocket.readyState = 1;
      mockWebSocket.onopen?.(new Event('open'));
    });

    expect(result.current.isConnected).toBe(true);

    // Manual disconnect
    act(() => {
      mockWebSocket.readyState = 3;
      mockWebSocket.onclose?.(new CloseEvent('close', { code: 1000 }));
    });

    expect(result.current.isConnected).toBe(false);
  });
});
