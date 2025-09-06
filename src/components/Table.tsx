import React, { FC, Suspense } from 'react';

import { useTable } from '../hooks/useTable';
import { COLUMNS } from './columns';
import { Header } from './Header';
import { TableFilters } from './TableFilters';
import { TableRow } from './TableRow';
import { TableRowSkeleton } from './TableRowSkeleton';

export interface TableProps {
  title?: string;
}

export const Table: FC<TableProps> = ({ title }) => {
  const {
    data,
    sort,
    handleSort,
    filters,
    handleFiltersChange,
    handleClearFilters,
    hasNextPage,
    isConnected,
    isConnecting,
    reconnectCountdown,
    isLoading,
    isFetchingNextPage,
    loadMoreRef,
    earlyLoadRef,
  } = useTable();

  return (
    <div>
      <Header
        title={title}
        isConnected={isConnected}
        isConnecting={isConnecting}
        reconnectCountdown={reconnectCountdown}
        tokenCount={data?.allPages.length ?? 0}
        totalCount={data?.pages[data.pages.length - 1]?.data.totalRows}
      />

      <TableFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onClearFilters={handleClearFilters}
      />

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
                    key={`${token.exchange}-${token.pairAddress}`}
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
          <div className="text-center py-8 text-gray-400">
            No data to display
          </div>
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
      </div>
    </div>
  );
};
