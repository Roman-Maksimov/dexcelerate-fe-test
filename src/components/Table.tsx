import { InfiniteData, useQueryClient } from '@tanstack/react-query';
import { AxiosResponse } from 'axios';
import React, {
  FC,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useGetScannerInfiniteQuery } from '../api/hooks';
import { usePrevious } from '../hooks/usePrevious';
import { useWebSocket } from '../hooks/useWebSocket';
import {
  GetScannerResultParams,
  OrderBy,
  ScannerApiResponse,
  TokenTableSort,
  TRENDING_TOKENS_FILTERS,
  WsTokenSwap,
} from '../scheme/type';
import { COLUMNS } from './columns';
import { TableRow } from './TableRow';
import { TableRowSkeleton } from './TableRowSkeleton';

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

export const Table: FC = () => {
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
    onTokensUpdate: newTokens => {
      // This is a full dataset replacement from scanner-pairs event
      console.log('Received full dataset update:', newTokens.length, 'tokens');

      // For infinite query, we need to replace the first page with new data
      const queryKey = ['API_KEY_GET_SCANNER', baseApiParams];

      queryClient.setQueryData(queryKey, (oldData: any) => {
        if (!oldData?.pages) return oldData;

        // Replace the first page with new tokens, keep other pages
        const updatedPages = [...oldData.pages];

        if (updatedPages.length > 0) {
          // Convert tokens back to API format for the first page
          const firstPageTokens = newTokens.slice(0, 100).map((token: any) => {
            // This is a simplified conversion - in real implementation,
            // you'd need to convert TokenData back to ScannerResult format
            return {
              pairAddress: token.id,
              token1Name: token.tokenName,
              token1Symbol: token.tokenSymbol,
              token1Address: token.tokenAddress,
              price: token.priceUsd.toString(),
              volume: token.volumeUsd.toString(),
              // ... other fields as needed
            };
          });

          updatedPages[0] = {
            ...updatedPages[0],
            data: {
              ...updatedPages[0].data,
              pairs: firstPageTokens,
            },
          };
        }

        return {
          ...oldData,
          pages: updatedPages,
          allPages: [...updatedPages],
        };
      });

      // Subscribe to real-time updates for all new tokens
      // newTokens.forEach((token: any) => {
      //   subscribeToPair(token);
      //   subscribeToPairStats(token);
      // });
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
                  pairs: page.data.pairs.map(item => {
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
                    const newPrice = parseFloat(latestSwap.priceToken1Usd);

                    // Recalculate market cap using total supply from token data
                    const newMarketCap =
                      parseFloat(item.token1TotalSupplyFormatted) * newPrice;

                    // Calculate volume from this swap
                    const swapVolume =
                      parseFloat(latestSwap.amountToken1) * newPrice;

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
                      price: newPrice,
                      pairMcapUsd: newMarketCap,
                      volume: item.volume + swapVolume,
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
                      honeyPot: !pair.token1IsHoneypot,
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

  return (
    <div className="bg-gray-900 rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-800">
            <tr>
              {COLUMNS.map(column => (
                <th
                  key={column.key}
                  className={`p-2 text-xs font-medium text-gray-300 uppercase tracking-wider ${
                    column.sortable ? 'cursor-pointer hover:bg-gray-700' : ''
                  } ${
                    column.align === 'right'
                      ? 'text-right'
                      : column.align === 'center'
                        ? 'text-center'
                        : 'text-left'
                  }`}
                  style={{ width: column.width }}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div
                    className={`flex items-center ${
                      column.align === 'right'
                        ? 'justify-end'
                        : column.align === 'center'
                          ? 'justify-center'
                          : ''
                    }`}
                  >
                    {column.label}
                    {column.sortable && (
                      <span className="ml-1 text-gray-400">
                        {sort.column === column.key
                          ? sort.direction === 'asc'
                            ? '↑'
                            : '↓'
                          : '↕'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-gray-900 divide-y divide-gray-700">
            {data?.allPages.map((token, index, arr) => {
              // Add early loading trigger when we're 80% through the data
              const shouldShowEarlyTrigger =
                hasNextPage &&
                !isLoading &&
                index === Math.floor(arr.length * 0.8) &&
                arr.length > 50; // Only show if we have enough data

              return (
                <Suspense
                  key={`${token.exchange}-${token.id}`}
                  fallback={<TableRowSkeleton />}
                >
                  <TableRow
                    token={token}
                    index={index}
                    shouldShowEarlyTrigger={shouldShowEarlyTrigger}
                    earlyLoadRef={earlyLoadRef}
                  />
                </Suspense>
              );
            })}

            {isLoading &&
              Array.from({ length: 100 }).map((_, index) => (
                <TableRowSkeleton key={`skeleton-${index}`} />
              ))}
          </tbody>
        </table>
      </div>

      {!data?.allPages.length && !isLoading && (
        <div className="text-center py-8 text-gray-400">No data to display</div>
      )}

      {/* Infinite scroll trigger and loading indicator */}
      {hasNextPage && (
        <div ref={loadMoreRef} className="px-4 py-4 bg-gray-800">
          <div className="text-center text-gray-400 text-sm">
            {isFetchingNextPage
              ? 'Loading more...'
              : 'Scroll down to load more'}
          </div>
        </div>
      )}

      <div className="px-4 py-3 bg-gray-800 text-sm text-gray-300">
        <div className="flex items-center justify-between">
          <div>
            Connection: {isConnected ? '🟢 Connected' : '🔴 Disconnected'} |{' '}
            Tokens: {data?.allPages.length ?? 0}
            {data?.pages &&
              data.pages.length > 1 &&
              ` | Pages: ${data.pages.length}`}
          </div>
        </div>
      </div>
    </div>
  );
};
