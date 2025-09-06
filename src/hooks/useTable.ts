import { InfiniteData, useQueryClient } from '@tanstack/react-query';
import { AxiosResponse } from 'axios';
import Decimal from 'decimal.js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { API_KEY_GET_SCANNER, useGetScannerInfiniteQuery } from '../api/hooks';
import {
  GetScannerResultParams,
  OrderBy,
  PairStatsMsgData,
  ScannerApiResponse,
  TickEventPayload,
  TokenTableFilters,
  TokenTableSort,
  WsTokenSwap,
} from '../scheme/type';
import { useWebSocket } from './useWebSocket';

// Map column keys to API parameters
const mapColumnToApiParams = (
  column: string,
  direction: 'asc' | 'desc'
): Partial<GetScannerResultParams> => {
  const orderBy: OrderBy = direction;
  switch (column) {
    case 'volumeUsd':
      return { rankBy: 'volume', orderBy };
    case 'mcap':
      return { rankBy: 'mcap', orderBy };
    case 'priceUsd':
      return { rankBy: 'price24H', orderBy };
    case 'priceChange5m':
      return { rankBy: 'price5M', orderBy };
    case 'priceChange1h':
      return { rankBy: 'price1H', orderBy };
    case 'priceChange6h':
      return { rankBy: 'price6H', orderBy };
    case 'priceChange24h':
      return { rankBy: 'price24H', orderBy };
    case 'buys':
      return { rankBy: 'buys', orderBy };
    case 'sells':
      return { rankBy: 'sells', orderBy };
    case 'liquidity':
      return { rankBy: 'liquidity', orderBy };
    case 'tokenCreatedTimestamp':
      return { rankBy: 'age', orderBy: direction === 'asc' ? 'desc' : 'asc' }; // Invert for age (newest first)
    case 'txns':
      return { rankBy: 'txns', orderBy };
    case 'trending':
      return { rankBy: 'trending', orderBy };
    default:
      return { rankBy: 'volume', orderBy }; // Default fallback
  }
};

// Convert TokenTableFilters to GetScannerResultParams
const convertFiltersToApiParams = (
  filters: TokenTableFilters
): Partial<GetScannerResultParams> => {
  const apiParams: Partial<GetScannerResultParams> = {};

  if (filters.chain) {
    apiParams.chain = filters.chain;
  }

  if (filters.minVolume !== null && filters.minVolume !== undefined) {
    apiParams.minVol24H = filters.minVolume;
  }

  if (filters.maxAge !== null && filters.maxAge !== undefined) {
    apiParams.maxAge = filters.maxAge;
  }

  if (filters.minMcap !== null && filters.minMcap !== undefined) {
    apiParams.minMcap = filters.minMcap;
  }

  if (filters.excludeHoneypots) {
    apiParams.isNotHP = true;
  }

  return apiParams;
};

interface UseTableProps {
  filters?: TokenTableFilters;
}

export const useTable = ({ filters: customFilters }: UseTableProps) => {
  const queryClient = useQueryClient();
  const [sort, setSort] = useState<TokenTableSort>({
    column: 'volumeUsd',
    direction: 'desc',
  });
  const [filters, setFilters] = useState<TokenTableFilters>({
    chain: null,
    minVolume: null,
    maxAge: null,
    minMcap: null,
    excludeHoneypots: false,
  });
  const [isInit, setIsInit] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const earlyLoadRef = useRef<HTMLDivElement>(null);

  // Create API parameters with current sort and filters
  const baseApiParams = useMemo(() => {
    const sortParams = mapColumnToApiParams(sort.column, sort.direction);
    const filterParams = filters ? convertFiltersToApiParams(filters) : {};
    return {
      ...customFilters,
      ...sortParams,
      ...filterParams,
    };
  }, [sort.column, sort.direction, filters, customFilters]);

  // Use infinite query for pagination
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useGetScannerInfiniteQuery(baseApiParams);

  const ticksStackRef = useRef<Map<string, TickEventPayload>>(new Map());
  const statsStackRef = useRef<Map<string, PairStatsMsgData>>(new Map());

  // WebSocket connection
  const {
    isConnected,
    isConnecting,
    reconnectCountdown,
    subscriptionTicksRef,
    subscriptionStatsRef,
    subscribeToScanner,
    unsubscribeFromScanner,
    subscribeToPair,
    unsubscribeFromPair,
    subscribeToPairStats,
    unsubscribeFromPairStats,
  } = useWebSocket({
    onScanner: updateData => {
      // Update specific token in infinite query cache
      const queryKey = [API_KEY_GET_SCANNER, baseApiParams];

      queryClient.setQueryData(
        queryKey,
        (oldData: InfiniteData<AxiosResponse<ScannerApiResponse>>) => {
          if (!oldData?.pages) return oldData;

          // Helper function to chunk array into pages of specified size
          const chunkArray = <T>(array: T[], chunkSize: number): T[][] => {
            const chunks: T[][] = [];
            for (let i = 0; i < array.length; i += chunkSize) {
              chunks.push(array.slice(i, i + chunkSize));
            }
            return chunks;
          };

          const newPairs = updateData.results.pairs;
          const pageSize = 100; // Page size
          const newPages = chunkArray(newPairs, pageSize);

          return {
            ...oldData,
            pages: newPages.map((pairs, index) => {
              // Use existing page structure or create new one
              const existingPage = oldData.pages[index];
              return {
                ...existingPage,
                data: {
                  ...existingPage?.data,
                  pairs,
                },
              };
            }),
          };
        }
      );

      ticksStackRef.current.clear();
      statsStackRef.current.clear();
    },

    onTick: updateData => {
      ticksStackRef.current.set(updateData.pair.pair, updateData);
    },

    onStats: updateData => {
      statsStackRef.current.set(updateData.pair.pairAddress, updateData);
    },
    onReconnected: () => {
      // Re-subscribe to all data when WebSocket reconnects
      if (isConnected && data?.allPages.length) {
        subscribe();
      }
    },
  });

  const subscribe = useCallback(() => {
    // Clean up obsolete pairs
    Array.from(subscriptionTicksRef.current.keys())
      .filter(pairAddress => !data?.pairs[pairAddress])
      .forEach(unsubscribeFromPair);

    Array.from(subscriptionStatsRef.current.keys())
      .filter(pairAddress => !data?.pairs[pairAddress])
      .forEach(unsubscribeFromPairStats);

    data?.allPages.forEach(token => {
      if (!subscriptionTicksRef.current.has(token.pairAddress)) {
        subscribeToPair(token);
      }

      if (!subscriptionStatsRef.current.has(token.pairAddress)) {
        subscribeToPairStats(token);
      }
    });
  }, [
    data?.allPages,
    data?.pairs,
    subscribeToPair,
    subscribeToPairStats,
    subscriptionStatsRef,
    subscriptionTicksRef,
    unsubscribeFromPair,
    unsubscribeFromPairStats,
  ]);

  const processUpdates = useCallback(() => {
    const ticks = new Map(ticksStackRef.current);
    const stats = new Map(statsStackRef.current);

    ticksStackRef.current.clear();
    statsStackRef.current.clear();

    // Update specific token in infinite query cache
    const queryKey = [API_KEY_GET_SCANNER, baseApiParams];

    queryClient.setQueryData(
      queryKey,
      (oldData: InfiniteData<AxiosResponse<ScannerApiResponse>>) => {
        if (!oldData?.pages) return oldData;

        return {
          ...oldData,
          pages: oldData.pages.map(page => {
            return {
              ...page,
              data: {
                ...page.data,
                pairs: page.data.pairs.map(item => {
                  if (
                    !ticks.has(item.pairAddress) &&
                    !stats.has(item.pairAddress)
                  ) {
                    return item;
                  }

                  const newData = {
                    ...item,
                  };

                  if (ticks.has(item.pairAddress)) {
                    const { pair, swaps } = ticks.get(item.pairAddress)!;
                    const tokenId = pair.pair;

                    // Get the latest non-outlier swap
                    const latestSwap = swaps
                      .filter((swap: WsTokenSwap) => !swap.isOutlier)
                      .pop();

                    if (item.pairAddress !== tokenId || !latestSwap) {
                      return item;
                    }

                    // Update price from the latest swap
                    const newPrice = new Decimal(latestSwap.priceToken1Usd);

                    // Recalculate market cap using total supply from token data
                    const newMarketCap = newPrice.mul(
                      item.token1TotalSupplyFormatted
                    );

                    // Calculate volume from this swap
                    const newVolume = newPrice
                      .mul(latestSwap.amountToken1)
                      .add(item.volume);

                    const [buys, sells] = swaps.reduce(
                      (prev, swap) => {
                        const isBuy =
                          swap.tokenInAddress === item.token1Address;

                        return isBuy
                          ? [prev[0] + 1, prev[1]]
                          : [prev[0], prev[1] + 1];
                      },
                      [0, 0]
                    );

                    newData.price = latestSwap.priceToken1Usd;
                    newData.currentMcap = newMarketCap.toString();
                    newData.volume = newVolume.toString();
                    newData.buys = (item.buys ?? 0) + buys;
                    newData.sells = (item.sells ?? 0) + sells;
                  }

                  if (stats.has(item.pairAddress)) {
                    const { pair, pairStats, migrationProgress } = stats.get(
                      item.pairAddress
                    )!;

                    newData.diff5M = pairStats.fiveMin.diff;
                    newData.diff1H = pairStats.oneHour.diff;
                    newData.diff6H = pairStats.sixHour.diff;
                    newData.diff24H = pairStats.twentyFourHour.diff;
                    newData.migrationProgress = migrationProgress;
                    newData.isMintAuthDisabled = pair.mintAuthorityRenounced;
                    newData.isFreezeAuthDisabled =
                      pair.freezeAuthorityRenounced;
                    newData.honeyPot = !pair.token1IsHoneypot;
                    newData.contractVerified = item.contractVerified; // preserve existing
                    newData.dexPaid = pair.dexPaid;
                    newData.discordLink = pair.linkDiscord;
                    newData.telegramLink = pair.linkTelegram;
                    newData.twitterLink = pair.linkTwitter;
                    newData.webLink = pair.linkWebsite;
                  }

                  return newData;
                }),
              },
            };
          }),
        };
      }
    );
  }, [baseApiParams, queryClient]);

  // Processing data updates in bulk with some interval
  useEffect(() => {
    const interval = setInterval(
      processUpdates,
      import.meta.env.VITE_DATA_UPDATE_INTERVAL
        ? parseInt(import.meta.env.VITE_DATA_UPDATE_INTERVAL)
        : 1_000
    );

    return () => {
      clearInterval(interval);
    };
  }, [processUpdates]);

  // Subscribes to data updates
  useEffect(() => {
    if (isConnected && !isInit && !!data?.allPages.length) {
      subscribe();
      setIsInit(true);
    }
  }, [data?.allPages, isConnected, isInit, subscribe]);

  // Drops the init flag to initiate a re-subscription to data updates
  useEffect(() => {
    if (baseApiParams) {
      setIsInit(false);
      subscribeToScanner(baseApiParams);
    }

    return () => {
      unsubscribeFromScanner(baseApiParams);
    };
  }, [baseApiParams, subscribeToScanner, unsubscribeFromScanner]);

  // Load next page using infinite query
  const loadNextPage = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting) {
          loadNextPage();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '200px', // Start loading 200px before the element comes into view
      }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [loadNextPage]);

  // Early loading trigger - starts loading when user is 80% through current data
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting) {
          loadNextPage();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '500px', // Start loading 500px before the element comes into view
      }
    );

    const currentRef = earlyLoadRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [loadNextPage]);

  const handleSort = (column: string) => {
    setSort(prev => ({
      column,
      direction:
        prev.column === column && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
    // Data will be refetched automatically due to apiParams dependency
  };

  const handleFiltersChange = useCallback((newFilters: TokenTableFilters) => {
    setFilters(newFilters);
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({
      chain: null,
      minVolume: null,
      maxAge: null,
      minMcap: null,
      excludeHoneypots: false,
    });
  }, []);

  return {
    sort,
    handleSort,
    filters,
    handleFiltersChange,
    handleClearFilters,
    loadMoreRef,
    earlyLoadRef,
    data,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    isLoading,
    isConnected,
    isConnecting,
    reconnectCountdown,
  };
};
