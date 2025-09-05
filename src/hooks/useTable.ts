import { InfiniteData, useQueryClient } from '@tanstack/react-query';
import { AxiosResponse } from 'axios';
import Decimal from 'decimal.js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { API_KEY_GET_SCANNER, useGetScannerInfiniteQuery } from '../api/hooks';
import {
  GetScannerResultParams,
  OrderBy,
  ScannerApiResponse,
  TokenTableSort,
  TRENDING_TOKENS_FILTERS,
  WsTokenSwap,
} from '../scheme/type';
import { usePrevious } from './usePrevious';
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

export const useTable = () => {
  const queryClient = useQueryClient();
  const [sort, setSort] = useState<TokenTableSort>({
    column: 'volumeUsd',
    direction: 'desc',
  });
  const [isInit, setInit] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const earlyLoadRef = useRef<HTMLDivElement>(null);

  // Create API parameters with current sort (without page)
  const baseApiParams = useMemo(() => {
    const sortParams = mapColumnToApiParams(sort.column, sort.direction);
    return {
      ...TRENDING_TOKENS_FILTERS,
      ...sortParams,
    };
  }, [sort]);

  // Use infinite query for pagination
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useGetScannerInfiniteQuery(baseApiParams);

  const prevIsLoading = usePrevious(isLoading);
  const prevIsFetchingNextPage = usePrevious(isFetchingNextPage);

  // WebSocket connection
  const {
    isConnected,
    subscriptionsRef,
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
          const pageSize = 100; // Размер страницы
          const newPages = chunkArray(newPairs, pageSize);

          return {
            ...oldData,
            pages: newPages.map((pairs, index) => {
              // Используем существующую структуру страницы или создаем новую
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
    },

    onTick: updateData => {
      // Update specific token in infinite query cache
      const queryKey = ['API_KEY_GET_SCANNER', baseApiParams];

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
                  pairs: page.data.pairs.map((item, index) => {
                    const { pair, swaps } = updateData;
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

                    return {
                      ...item,
                      price: latestSwap.priceToken1Usd,
                      currentMcap: newMarketCap.toString(),
                      volume: newVolume.toString(),
                      buys: (item.buys ?? 0) + buys,
                      sells: (item.sells ?? 0) + sells,
                    };
                  }),
                },
              };
            }),
          };
        }
      );
    },

    onStats: updateData => {
      // Update specific token in infinite query cache
      const queryKey = ['API_KEY_GET_SCANNER', baseApiParams];

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
                    const { pair, migrationProgress } = updateData;

                    if (item.pairAddress !== pair.pairAddress) {
                      return item;
                    }

                    return {
                      ...item,
                      migrationProgress: Number(migrationProgress),
                      isMintAuthDisabled: pair.mintAuthorityRenounced,
                      isFreezeAuthDisabled: pair.freezeAuthorityRenounced,
                      honeyPot: pair.token1IsHoneypot,
                      contractVerified: item.contractVerified, // preserve existing
                    };
                  }),
                },
              };
            }),
          };
        }
      );
    },
  });

  const subscribe = useCallback(() => {
    // Clean up obsolete pairs
    Array.from(subscriptionsRef.current.keys())
      .filter(pairAddress => !data?.pairs[pairAddress])
      .forEach(pairAddress => {
        unsubscribeFromPair(pairAddress);
        unsubscribeFromPairStats(pairAddress);
      });

    data?.allPages
      .filter(token => !subscriptionsRef.current.has(token.pairAddress))
      .forEach(token => {
        subscribeToPair(token);
        subscribeToPairStats(token);
      });
  }, [
    data?.allPages,
    data?.pairs,
    subscribeToPair,
    subscribeToPairStats,
    subscriptionsRef,
    unsubscribeFromPair,
    unsubscribeFromPairStats,
  ]);

  // Subscribe to WebSocket updates with current sort parameters
  useEffect(() => {
    if (isConnected) {
      subscribeToScanner(baseApiParams);
      return () => {
        unsubscribeFromScanner(baseApiParams);
      };
    }
  }, [isConnected, subscribeToScanner, unsubscribeFromScanner, baseApiParams]);

  useEffect(() => {
    if (isConnected && !isInit && !!data?.allPages.length) {
      subscribe();
      setInit(true);
    }
  }, [data?.allPages, isConnected, isInit, subscribe]);

  useEffect(() => {
    if (
      (prevIsLoading && !isLoading) ||
      (prevIsFetchingNextPage && !isFetchingNextPage)
    ) {
      subscribe();
    }
  }, [
    isFetchingNextPage,
    isLoading,
    prevIsFetchingNextPage,
    prevIsLoading,
    subscribe,
  ]);

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

  return {
    sort,
    handleSort,
    loadMoreRef,
    earlyLoadRef,
    data,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    isLoading,
    isConnected,
  };
};
