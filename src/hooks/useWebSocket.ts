import { useCallback, useEffect, useRef, useState } from 'react';

import {
  GetScannerResultParams,
  IncomingWebSocketMessage,
  OutgoingWebSocketMessage,
  PairStatsMsgData,
  ScannerPairsEventPayload,
  SupportedChainName,
  TickEventPayload,
  TokenData,
  WpegPricesEventPayload,
} from '../scheme/type';

interface UseWebSocketOptions {
  onTokensUpdate?: (tokens: TokenData[]) => void;
  onScanner?: (data: ScannerPairsEventPayload) => void;
  onTick?: (data: TickEventPayload) => void;
  onStats?: (data: PairStatsMsgData) => void;
  onError?: (error: Event) => void;
  onReconnected?: () => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ws, setWs] = useState<WebSocket>();
  const [reconnectCountdown, setReconnectCountdown] = useState<number | null>(
    null
  );
  const [isConnecting, setIsConnecting] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const subscriptionsRef = useRef<
    Map<
      string,
      {
        pair: string;
        token: string;
        chain: SupportedChainName;
      }
    >
  >(new Map());
  const lastScannerParamsRef = useRef<GetScannerResultParams | null>(null);

  const { onScanner, onTick, onStats, onError, onReconnected } = options;

  // Function to clear reconnection timers
  const clearReconnectTimers = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setReconnectCountdown(null);
    setIsConnecting(false);
  }, []);

  // Function for reconnection (separate from connect to avoid circular dependency)
  const reconnect = useCallback(() => {
    clearReconnectTimers();

    let countdown = 3;
    setReconnectCountdown(countdown);

    countdownIntervalRef.current = setInterval(() => {
      countdown -= 1;
      setReconnectCountdown(countdown);

      if (countdown <= 0) {
        clearInterval(countdownIntervalRef.current!);
        countdownIntervalRef.current = null;
        setReconnectCountdown(null);
      }
    }, 1000);

    reconnectTimeoutRef.current = setTimeout(() => {
      // Clear countdown before attempting connection
      setReconnectCountdown(null);
      // Set connecting state
      setIsConnecting(true);

      // Close existing connection
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      try {
        console.log('Attempting to reconnect to WebSocket...');
        wsRef.current = new WebSocket(import.meta.env.VITE_WS_URL);
        setWs(wsRef.current);
      } catch (err) {
        console.error('Failed to create WebSocket connection:', err);
        setError('Failed to create WebSocket connection');
        setIsConnecting(false);
        // Recursively start reconnection
        setTimeout(() => reconnect(), 1000);
      }
    }, 3000);
  }, [clearReconnectTimers]);

  const sendMessage = useCallback((message: OutgoingWebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  }, []);

  // Function to restore all active subscriptions
  const restoreSubscriptions = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    // Restore scanner subscription
    if (lastScannerParamsRef.current) {
      sendMessage({
        event: 'scanner-filter',
        data: lastScannerParamsRef.current,
      });
    }

    // Restore pair subscriptions
    subscriptionsRef.current.forEach((subscription, key) => {
      if (key.startsWith('pair-')) {
        sendMessage({
          event: 'subscribe-pair',
          data: subscription,
        });
      } else if (key.startsWith('pair-stats-')) {
        sendMessage({
          event: 'subscribe-pair-stats',
          data: subscription,
        });
      }
    });

    console.log('Restored subscriptions:', subscriptionsRef.current.size);
  }, [sendMessage]);

  const subscribeToPair = useCallback(
    (token: TokenData) => {
      const subscriptionKey = `pair-${token.pairAddress}`;
      if (subscriptionsRef.current.has(subscriptionKey)) {
        return;
      }

      const data = {
        pair: token.pairAddress,
        token: token.tokenAddress,
        chain: token.chain,
      };

      sendMessage({
        event: 'subscribe-pair',
        data,
      });

      subscriptionsRef.current.set(subscriptionKey, data);
    },
    [sendMessage]
  );

  const subscribeToPairStats = useCallback(
    (token: TokenData) => {
      const subscriptionKey = `pair-stats-${token.pairAddress}`;
      if (subscriptionsRef.current.has(subscriptionKey)) {
        return;
      }

      const data = {
        pair: token.pairAddress,
        token: token.tokenAddress,
        chain: token.chain,
      };

      sendMessage({
        event: 'subscribe-pair-stats',
        data,
      });

      subscriptionsRef.current.set(subscriptionKey, data);
    },
    [sendMessage]
  );

  const unsubscribeFromPair = useCallback(
    (pairAddress: string) => {
      const subscriptionKey = `pair-${pairAddress}`;
      if (!subscriptionsRef.current.has(subscriptionKey)) {
        return;
      }

      sendMessage({
        event: 'unsubscribe-pair',
        data: subscriptionsRef.current.get(subscriptionKey)!,
      });

      subscriptionsRef.current.delete(subscriptionKey);
    },
    [sendMessage]
  );

  const unsubscribeFromPairStats = useCallback(
    (pairAddress: string) => {
      const subscriptionKey = `pair-stats-${pairAddress}`;
      if (!subscriptionsRef.current.has(subscriptionKey)) {
        return;
      }

      sendMessage({
        event: 'unsubscribe-pair-stats',
        data: subscriptionsRef.current.get(subscriptionKey)!,
      });

      subscriptionsRef.current.delete(subscriptionKey);
    },
    [sendMessage]
  );

  const subscribeToScanner = useCallback(
    (filters: GetScannerResultParams) => {
      lastScannerParamsRef.current = filters;
      sendMessage({
        event: 'scanner-filter',
        data: filters,
      });
    },
    [sendMessage]
  );

  const unsubscribeFromScanner = useCallback(
    (filters: GetScannerResultParams) => {
      sendMessage({
        event: 'unsubscribe-scanner-filter',
        data: filters,
      });
    },
    [sendMessage]
  );

  const handleWpegPricesUpdate = useCallback((data: WpegPricesEventPayload) => {
    console.log('Received WPEG prices:', data.prices);
    // Here you can add logic to update WPEG token prices
    // For example, update global state with prices
  }, []);

  const handleMessage = useCallback(
    (message: IncomingWebSocketMessage) => {
      switch (message.event) {
        case 'scanner-pairs':
          onScanner?.(message.data);
          break;
        case 'tick':
          onTick?.(message.data);
          break;
        case 'pair-stats':
          onStats?.(message.data);
          break;
        case 'wpeg-prices':
          handleWpegPricesUpdate(message.data);
          break;
        default:
          console.log('Unknown WebSocket message type:', message);
      }
    },
    [handleWpegPricesUpdate, onScanner, onStats, onTick]
  );

  const connect = useCallback(() => {
    // Clear reconnection timers
    clearReconnectTimers();

    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Set connecting state
    setIsConnecting(true);

    try {
      console.log('Attempting to connect to WebSocket...');
      wsRef.current = new WebSocket(
        import.meta.env.VITE_WS_URL || 'wss://api-rs.dexcelerate.com/ws'
      );
      setWs(wsRef.current);
    } catch (err) {
      console.error('Failed to create WebSocket connection:', err);
      setError('Failed to create WebSocket connection');
      setIsConnecting(false);
      // Start reconnection on connection creation error
      reconnect();
    }
  }, [clearReconnectTimers, reconnect]);

  const disconnect = useCallback(() => {
    console.log('Disconnecting WebSocket...');
    clearReconnectTimers();
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }
    setWs(undefined);
    setIsConnected(false);
  }, [clearReconnectTimers]);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Clear timers on component unmount
  useEffect(() => {
    return () => {
      clearReconnectTimers();
    };
  }, [clearReconnectTimers]);

  useEffect(() => {
    if (ws) {
      ws.onopen = () => {
        console.log('WebSocket connected successfully');
        setIsConnected(true);
        setError(null);
        setIsConnecting(false);
        clearReconnectTimers();
        
        // Restore subscriptions after reconnection
        setTimeout(() => {
          restoreSubscriptions();
          onReconnected?.();
        }, 100); // Small delay to ensure connection is fully established
      };

      ws.onclose = event => {
        console.log('WebSocket disconnected', event.code, event.reason);
        setIsConnected(false);

        // Start reconnection only if it wasn't a manual disconnect
        if (event.code !== 1000) {
          reconnect();
        }
      };

      ws.onerror = event => {
        console.error('WebSocket error:', event);
        setError('WebSocket connection error');
        onError?.(event);
        // On error also start reconnection
        reconnect();
      };

      ws.onmessage = event => {
        try {
          const message: IncomingWebSocketMessage = JSON.parse(event.data);
          handleMessage(message);
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };
    }
  }, [handleMessage, onError, ws, clearReconnectTimers, reconnect, restoreSubscriptions, onReconnected]);

  return {
    isConnected,
    isConnecting,
    error,
    reconnectCountdown,
    subscriptionsRef,
    subscribeToScanner,
    unsubscribeFromScanner,
    subscribeToPair,
    unsubscribeFromPair,
    subscribeToPairStats,
    unsubscribeFromPairStats,
  };
}
