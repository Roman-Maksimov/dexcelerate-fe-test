import { useCallback, useEffect, useRef, useState } from 'react';

import {
  GetScannerResultParams,
  IncomingWebSocketMessage,
  OutgoingWebSocketMessage,
  PairStatsMsgData,
  ScannerResult,
  SupportedChainName,
  TokenData,
  WpegPricesEventPayload,
  WsTokenSwap,
} from '../scheme/type';
import { convertToTokenData } from '../utils/tokenUtils';

interface OnTokenUpdateData {
  pair: { pair: string };
  swaps: WsTokenSwap[];
}

interface UseWebSocketOptions {
  onTokensUpdate?: (tokens: TokenData[]) => void;
  onTokenUpdate?: (data: OnTokenUpdateData) => void;
  onError?: (error: Event) => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ws, setWs] = useState<WebSocket>();
  const wsRef = useRef<WebSocket | null>(null);
  const tokensRef = useRef<Map<string, TokenData>>(new Map());
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

  const { onTokensUpdate, onTokenUpdate, onError } = options;

  const sendMessage = useCallback((message: OutgoingWebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  }, []);

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

  const handleScannerPairsUpdate = useCallback(
    (data: { results: { pairs: ScannerResult[] } }) => {
      console.log(
        'Received scanner-pairs update:',
        data.results.pairs.length,
        'pairs'
      );

      const newTokens = data.results.pairs.map((result: ScannerResult) =>
        convertToTokenData(result)
      );

      // Clear existing subscriptions
      subscriptionsRef.current.clear();

      // Update tokens map - this is a full dataset replacement
      tokensRef.current.clear();
      newTokens.forEach((token: TokenData) => {
        tokensRef.current.set(token.id, token);
      });

      // Subscribe to individual pair updates for each token
      newTokens.forEach((token: TokenData) => {
        subscribeToPair(token);
        subscribeToPairStats(token);
      });

      // Notify parent component of full dataset replacement
      onTokensUpdate?.(newTokens);
    },
    [onTokensUpdate, subscribeToPair, subscribeToPairStats]
  );

  const handlePairStatsUpdate = useCallback((data: PairStatsMsgData) => {
    const { pair } = data;
    const tokenId = pair.pairAddress;

    if (tokensRef.current.has(tokenId)) {
      const token = tokensRef.current.get(tokenId)!;

      const updatedToken: TokenData = {
        ...token,
        migrationPc: parseFloat(data.migrationProgress),
        audit: {
          ...token.audit,
          mintable: pair.mintAuthorityRenounced,
          freezable: pair.freezeAuthorityRenounced,
          honeypot: !pair.token1IsHoneypot,
          contractVerified: pair.isVerified,
        },
        socialLinks: {
          discord: pair.linkDiscord || undefined,
          telegram: pair.linkTelegram || undefined,
          twitter: pair.linkTwitter || undefined,
          website: pair.linkWebsite || undefined,
        },
        dexPaid: pair.dexPaid,
      };

      tokensRef.current.set(tokenId, updatedToken);
      // onTokenUpdate?.(updatedToken);

      console.log(
        'Updated token from pair-stats:',
        token.tokenSymbol,
        'migration:',
        data.migrationProgress
      );
    }
  }, []);

  const handleWpegPricesUpdate = useCallback((data: WpegPricesEventPayload) => {
    console.log('Received WPEG prices:', data.prices);
    // Здесь можно добавить логику для обновления цен WPEG токенов
    // Например, обновить глобальное состояние с ценами
  }, []);

  const handleMessage = useCallback(
    (message: IncomingWebSocketMessage) => {
      switch (message.event) {
        case 'scanner-pairs':
          handleScannerPairsUpdate(message.data);
          break;
        case 'tick':
          onTokenUpdate?.(message.data);
          break;
        case 'pair-stats':
          handlePairStatsUpdate(message.data);
          break;
        case 'wpeg-prices':
          handleWpegPricesUpdate(message.data);
          break;
        default:
          console.log('Unknown WebSocket message type:', message);
      }
    },
    [
      handlePairStatsUpdate,
      handleScannerPairsUpdate,
      handleWpegPricesUpdate,
      onTokenUpdate,
    ]
  );

  const connect = useCallback(() => {
    // Закрываем существующее соединение
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    try {
      console.log('Attempting to connect to WebSocket...');
      wsRef.current = new WebSocket(
        import.meta.env.VITE_WS_URL || 'wss://api-rs.dexcelerate.com/ws'
      );
      setWs(wsRef.current);
    } catch (err) {
      console.error('Failed to create WebSocket connection:', err);
      setError('Failed to create WebSocket connection');
    }
  }, []);

  const disconnect = useCallback(() => {
    console.log('Disconnecting WebSocket...');
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }
    setWs(undefined);
    setIsConnected(false);
  }, []);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  useEffect(() => {
    if (ws) {
      ws.onopen = () => {
        console.log('WebSocket connected successfully');
        setIsConnected(true);
        setError(null);
      };

      ws.onclose = event => {
        console.log('WebSocket disconnected', event.code, event.reason);
        setIsConnected(false);
      };

      ws.onerror = event => {
        console.error('WebSocket error:', event);
        setError('WebSocket connection error');
        onError?.(event);
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
  }, [handleMessage, onError, ws]);

  return {
    isConnected,
    error,
    subscriptionsRef,
    subscribeToScanner,
    unsubscribeFromScanner,
    subscribeToPair,
    unsubscribeFromPair,
    subscribeToPairStats,
    unsubscribeFromPairStats,
  };
}
