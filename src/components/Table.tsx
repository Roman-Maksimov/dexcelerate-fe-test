import { useQueryClient } from '@tanstack/react-query';
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
import { useWebSocket } from '../hooks/useWebSocket';
import {
  GetScannerResultParams,
  OrderBy,
  TokenTableSort,
  TRENDING_TOKENS_FILTERS,
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
  const [sort, setSort] = useState<TokenTableSort>({
    column: 'volumeUsd',
    direction: 'desc',
  });
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const earlyLoadRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

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

  // WebSocket connection
  const { isConnected, subscribeToScanner, unsubscribeFromScanner } =
    useWebSocket({
      onTokensUpdate: newTokens => {
        // Update infinite query cache with new tokens
        const queryKey = ['API_KEY_GET_SCANNER', baseApiParams];

        queryClient.setQueryData(queryKey, (oldData: any) => {
          if (!oldData?.pages) return oldData;

          // Update each page with new tokens
          const updatedPages = oldData.pages.map(
            (page: any, pageIndex: number) => {
              const startIndex = pageIndex * 100;
              const endIndex = (pageIndex + 1) * 100;
              const pageTokens = newTokens.slice(startIndex, endIndex);

              return {
                ...page,
                data: {
                  ...page.data,
                  pairs: pageTokens.map((token: any) => {
                    // Convert back to API format if needed
                    return {
                      id: token.id,
                      tokenName: token.tokenName,
                      tokenSymbol: token.tokenSymbol,
                      // ... other fields
                    };
                  }),
                },
              };
            }
          );

          return {
            ...oldData,
            pages: updatedPages,
          };
        });
      },
      onTokenUpdate: updatedToken => {
        // Update specific token in infinite query cache
        const queryKey = ['API_KEY_GET_SCANNER', baseApiParams];

        queryClient.setQueryData(queryKey, (oldData: any) => {
          if (!oldData?.pages) return oldData;

          const updatedPages = oldData.pages.map((page: any) => {
            if (!page.data?.pairs) return page;

            return {
              ...page,
              data: {
                ...page.data,
                pairs: page.data.pairs.map((pair: any) => {
                  const tokenId = `${pair.exchange}-${pair.id}`;
                  if (tokenId === updatedToken.id) {
                    // Convert updated token back to API format
                    return {
                      ...pair,
                      // Update fields from updatedToken
                    };
                  }
                  return pair;
                }),
              },
            };
          });

          return {
            ...oldData,
            pages: updatedPages,
          };
        });
      },
    });

  // Subscribe to WebSocket updates with current sort parameters
  useEffect(() => {
    if (isConnected) {
      subscribeToScanner(baseApiParams);
      return () => {
        unsubscribeFromScanner(baseApiParams);
      };
    }
  }, [isConnected, subscribeToScanner, unsubscribeFromScanner, baseApiParams]);

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

  // Reset pagination when sort changes
  useEffect(() => {
    // Infinite query will automatically reset when queryKey changes
    // No manual reset needed
  }, [sort]);

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

      {!data?.allPages.length === 0 && !isLoading && (
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
