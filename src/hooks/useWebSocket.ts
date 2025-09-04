import { useCallback, useEffect, useRef, useState } from 'react';

import {
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
  const wsRef = useRef<WebSocket | null>(null);
  const tokensRef = useRef<Map<string, TokenData>>(new Map());
  const subscriptionsRef = useRef<Set<string>>(new Set());

  const { onTokensUpdate, onTokenUpdate, onError } = options;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const ws = new WebSocket('wss://api-rs.dexcelerate.com/ws');
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
        console.log('WebSocket connected');
      };

      ws.onclose = () => {
        setIsConnected(false);
        console.log('WebSocket disconnected');
        // Reconnect after 3 seconds
        setTimeout(connect, 3000);
      };

      ws.onerror = event => {
        setError('WebSocket connection error');
        onError?.(event);
        console.error('WebSocket error:', event);
      };

      ws.onmessage = event => {
        try {
          const message: IncomingWebSocketMessage = JSON.parse(event.data);
          handleMessage(message);
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };
    } catch (err) {
      setError('Failed to create WebSocket connection');
      console.error('WebSocket connection error:', err);
    }
  }, [onError]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const sendMessage = useCallback((message: OutgoingWebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  }, []);

  const handleMessage = useCallback((message: IncomingWebSocketMessage) => {
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
  }, []);

  const handleScannerPairsUpdate = useCallback(
    (data: any) => {
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
    [onTokensUpdate]
  );

  const handleTickUpdate = useCallback(
    (data: any) => {
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
    (filters: any) => {
      sendMessage({
        event: 'scanner-filter',
        data: filters,
      });
    },
    [sendMessage]
  );

  const unsubscribeFromScanner = useCallback(
    (filters: any) => {
      sendMessage({
        event: 'unsubscribe-scanner-filter',
        data: filters,
      });
    },
    [sendMessage]
  );

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

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
