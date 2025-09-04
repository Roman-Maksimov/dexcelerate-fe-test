import { useCallback, useEffect, useRef, useState } from 'react';

import {
  GetScannerResultParams,
  IncomingWebSocketMessage,
  OutgoingWebSocketMessage,
  PairStatsMsgData,
  ScannerResult,
  TokenData,
  WsTokenSwap,
} from '../scheme/type';
import { convertToTokenData } from '../utils/tokenUtils';

interface UseWebSocketOptions {
  onTokensUpdate?: (tokens: TokenData[]) => void;
  onTokenUpdate?: (token: TokenData) => void;
  onError?: (error: Event) => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ws, setWs] = useState<WebSocket>();
  const wsRef = useRef<WebSocket | null>(null);
  const tokensRef = useRef<Map<string, TokenData>>(new Map());
  const subscriptionsRef = useRef<Set<string>>(new Set());

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

      sendMessage({
        event: 'subscribe-pair',
        data: {
          pair: token.pairAddress,
          token: token.tokenAddress,
          chain: token.chain,
        },
      });

      subscriptionsRef.current.add(subscriptionKey);
    },
    [sendMessage]
  );

  const subscribeToPairStats = useCallback(
    (token: TokenData) => {
      const subscriptionKey = `pair-stats-${token.pairAddress}`;
      if (subscriptionsRef.current.has(subscriptionKey)) {
        return;
      }

      sendMessage({
        event: 'subscribe-pair-stats',
        data: {
          pair: token.pairAddress,
          token: token.tokenAddress,
          chain: token.chain,
        },
      });

      subscriptionsRef.current.add(subscriptionKey);
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
      const newTokens = data.results.pairs.map((result: ScannerResult) =>
        convertToTokenData(result)
      );

      // Update tokens map
      tokensRef.current.clear();
      newTokens.forEach((token: TokenData) => {
        tokensRef.current.set(token.id, token);
      });

      // Subscribe to individual pair updates for each token
      newTokens.forEach((token: TokenData) => {
        subscribeToPair(token);
        subscribeToPairStats(token);
      });

      onTokensUpdate?.(newTokens);
    },
    [onTokensUpdate, subscribeToPair, subscribeToPairStats]
  );

  const handleTickUpdate = useCallback(
    (data: { pair: { pair: string }; swaps: WsTokenSwap[] }) => {
      const { pair, swaps } = data;
      const tokenId = pair.pair;

      // Get the latest non-outlier swap
      const latestSwap = swaps
        .filter((swap: WsTokenSwap) => !swap.isOutlier)
        .pop();

      if (latestSwap && tokensRef.current.has(tokenId)) {
        const token = tokensRef.current.get(tokenId)!;

        // Update price and recalculate market cap
        const newPrice = parseFloat(latestSwap.priceToken1Usd);
        const totalSupply = parseFloat(token.tokenAddress); // This should be from the original data

        const updatedToken: TokenData = {
          ...token,
          priceUsd: newPrice,
          mcap: totalSupply * newPrice,
          // Update volume and transactions based on swaps
          volumeUsd:
            token.volumeUsd + parseFloat(latestSwap.amountToken1) * newPrice,
          transactions: {
            buys:
              token.transactions.buys +
              (latestSwap.tokenInAddress === token.tokenAddress ? 1 : 0),
            sells:
              token.transactions.sells +
              (latestSwap.tokenInAddress !== token.tokenAddress ? 1 : 0),
          },
        };

        tokensRef.current.set(tokenId, updatedToken);
        onTokenUpdate?.(updatedToken);
      }
    },
    [onTokenUpdate]
  );

  const handlePairStatsUpdate = useCallback(
    (data: PairStatsMsgData) => {
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
        onTokenUpdate?.(updatedToken);
      }
    },
    [onTokenUpdate]
  );

  const handleMessage = useCallback(
    (message: IncomingWebSocketMessage) => {
      switch (message.event) {
        case 'scanner-pairs':
          handleScannerPairsUpdate(message.data);
          break;
        case 'tick':
          handleTickUpdate(message.data);
          break;
        case 'pair-stats':
          handlePairStatsUpdate(message.data);
          break;
        default:
          console.log('Unknown WebSocket message type:', message);
      }
    },
    [handlePairStatsUpdate, handleScannerPairsUpdate, handleTickUpdate]
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
    connect,
    disconnect,
    subscribeToScanner,
    unsubscribeFromScanner,
    sendMessage,
  };
}
