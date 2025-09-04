import React, {
  FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useGetScannerQuery } from '../api/hooks';
import { useWebSocket } from '../hooks/useWebSocket';
import {
  GetScannerResultParams,
  OrderBy,
  TokenData,
  TokenTableSort,
  TRENDING_TOKENS_FILTERS,
} from '../scheme/type';
import { Skeleton } from '../ui/skeleton';
import { convertToTokenData } from '../utils/tokenUtils';
import { COLUMNS } from './columns';
import { TableCell } from './TableCell';

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
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [sort, setSort] = useState<TokenTableSort>({
    column: 'volumeUsd',
    direction: 'desc',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const earlyLoadRef = useRef<HTMLDivElement>(null);

  // Create API parameters with current sort and pagination
  const apiParams = useMemo(() => {
    const sortParams = mapColumnToApiParams(sort.column, sort.direction);
    return {
      ...TRENDING_TOKENS_FILTERS,
      ...sortParams,
      page,
    };
  }, [sort, page]);

  // Fetch data with current sort parameters
  const { data: initialData, isLoading: isInitialLoading } =
    useGetScannerQuery(apiParams);

  // WebSocket connection
  const { isConnected, subscribeToScanner, unsubscribeFromScanner } =
    useWebSocket({
      onTokensUpdate: newTokens => {
        setTokens(newTokens);
        setIsLoading(false);
      },
      onTokenUpdate: updatedToken => {
        setTokens(prev =>
          prev.map(token =>
            token.id === updatedToken.id ? updatedToken : token
          )
        );
      },
    });

  // Convert initial data and handle pagination
  useEffect(() => {
    if (initialData?.data?.pairs) {
      // Show all items from each page (up to 100)
      const convertedTokens = initialData.data.pairs.map(convertToTokenData);

      if (page === 1) {
        // First page - replace all tokens
        setTokens(convertedTokens);
        setIsLoading(false);
      } else {
        // Subsequent pages - append to existing tokens
        setTokens(prev => [...prev, ...convertedTokens]);
        setIsLoadingMore(false);
      }

      // Update pagination info
      const currentPageItems = initialData.data.pairs?.length || 0;
      const itemsPerPage = 100; // API always returns 100 items per page

      // If we got less than 100 items, we've reached the end
      if (currentPageItems < itemsPerPage) {
        setHasMore(false);
      } else {
        // We can load more pages
        setHasMore(true);
      }
    }
  }, [initialData, page]);

  // Subscribe to WebSocket updates with current sort parameters
  useEffect(() => {
    if (isConnected) {
      subscribeToScanner(apiParams);
      return () => {
        unsubscribeFromScanner(apiParams);
      };
    }
  }, [isConnected, subscribeToScanner, unsubscribeFromScanner, apiParams]);

  // No client-side sorting needed - server handles it
  const sortedTokens = tokens;

  // Load next page
  const loadNextPage = useCallback(() => {
    if (hasMore && !isLoadingMore && !isLoading) {
      setIsLoadingMore(true);
      setPage(prev => prev + 1);
    }
  }, [hasMore, isLoadingMore, isLoading]);

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
    setPage(1);
    setTokens([]);
    setHasMore(true);
    setIsLoading(true);
  }, [sort]);

  const handleSort = (column: string) => {
    setSort(prev => ({
      column,
      direction:
        prev.column === column && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
    // Data will be refetched automatically due to apiParams dependency
  };

  // Render skeleton table during loading
  const renderSkeletonTable = () => (
    <div className="bg-gray-900 rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-800">
            <tr>
              {COLUMNS.map(column => (
                <th
                  key={column.key}
                  className={`p-2 text-xs font-medium text-gray-300 uppercase tracking-wider ${
                    column.align === 'right'
                      ? 'text-right'
                      : column.align === 'center'
                        ? 'text-center'
                        : 'text-left'
                  }`}
                  style={{ width: column.width }}
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
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-gray-900 divide-y divide-gray-700">
            {Array.from({ length: 100 }).map((_, index) => (
              <tr key={index} className="hover:bg-gray-800 transition-colors">
                {COLUMNS.map(column => (
                  <td
                    key={column.key}
                    className={`${
                      column.align === 'right'
                        ? 'text-right'
                        : column.align === 'center'
                          ? 'text-center'
                          : 'text-left'
                    }`}
                  >
                    <div
                      className="p-2 text-xs text-ellipsis overflow-hidden whitespace-nowrap"
                      style={{ width: column.width }}
                    >
                      <Skeleton className="h-[27px] w-full bg-gray-700" />
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (isLoading || isInitialLoading) {
    return renderSkeletonTable();
  }

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
            {sortedTokens.map((token, index) => {
              // Add early loading trigger when we're 80% through the data
              const shouldShowEarlyTrigger =
                hasMore &&
                !isLoadingMore &&
                index === Math.floor(sortedTokens.length * 0.8) &&
                sortedTokens.length > 50; // Only show if we have enough data

              return (
                <React.Fragment key={token.id}>
                  {shouldShowEarlyTrigger && (
                    <tr>
                      <td colSpan={COLUMNS.length} className="p-0">
                        <div ref={earlyLoadRef} className="h-1 w-full" />
                      </td>
                    </tr>
                  )}
                  <tr className="hover:bg-gray-800 transition-colors">
                    {COLUMNS.map(column => (
                      <td
                        key={column.key}
                        className={`${
                          column.align === 'right'
                            ? 'text-right'
                            : column.align === 'center'
                              ? 'text-center'
                              : 'text-left'
                        }`}
                      >
                        <div
                          className="p-2 text-xs text-ellipsis overflow-hidden whitespace-nowrap"
                          style={{ width: column.width }}
                        >
                          <TableCell
                            token={token}
                            column={column}
                            index={index}
                          />
                        </div>
                      </td>
                    ))}
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {tokens.length === 0 && !isLoading && (
        <div className="text-center py-8 text-gray-400">No data to display</div>
      )}

      {/* Infinite scroll trigger and loading indicator */}
      {hasMore && (
        <div ref={loadMoreRef} className="px-4 py-4 bg-gray-800">
          {isLoadingMore ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span className="text-gray-300">Loading more...</span>
            </div>
          ) : (
            <div className="text-center text-gray-400 text-sm">
              Scroll down to load more
            </div>
          )}
        </div>
      )}

      <div className="px-4 py-3 bg-gray-800 text-sm text-gray-300">
        <div className="flex items-center justify-between">
          <div>
            Connection: {isConnected ? '🟢 Connected' : '🔴 Disconnected'} |{' '}
            Tokens: {tokens.length}
            {page > 1 && ` | Page ${page}`}
          </div>
        </div>
      </div>
    </div>
  );
};
