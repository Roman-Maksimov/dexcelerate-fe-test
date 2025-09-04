import { FC, useEffect, useMemo, useState } from 'react';

import { useGetScannerQuery } from '../api/hooks';
import { useWebSocket } from '../hooks/useWebSocket';
import {
  TokenData,
  TokenTableSort,
  TRENDING_TOKENS_FILTERS,
} from '../scheme/type';
import { convertToTokenData } from '../utils/tokenUtils';
import { COLUMNS } from './columns';
import { getNestedValue, TableCell } from './TableCell';

export const Table: FC = () => {
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [sort, setSort] = useState<TokenTableSort>({
    column: 'volumeUsd',
    direction: 'desc',
  });
  const [isLoading, setIsLoading] = useState(true);

  // Initial data fetch
  const { data: initialData, isLoading: isInitialLoading } = useGetScannerQuery(
    TRENDING_TOKENS_FILTERS
  );

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

  // Convert initial data
  useEffect(() => {
    if (initialData?.data?.pairs) {
      const convertedTokens = initialData.data.pairs.map(convertToTokenData);
      setTokens(convertedTokens);
      setIsLoading(false);
    }
  }, [initialData]);

  // Subscribe to WebSocket updates
  useEffect(() => {
    if (isConnected) {
      subscribeToScanner(TRENDING_TOKENS_FILTERS);
      return () => {
        unsubscribeFromScanner(TRENDING_TOKENS_FILTERS);
      };
    }
  }, [isConnected, subscribeToScanner, unsubscribeFromScanner]);

  // Sort tokens
  const sortedTokens = useMemo(() => {
    return [...tokens].sort((a, b) => {
      const aValue = getNestedValue(a, sort.column);
      const bValue = getNestedValue(b, sort.column);

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sort.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();

      if (sort.direction === 'asc') {
        return aStr.localeCompare(bStr);
      } else {
        return bStr.localeCompare(aStr);
      }
    });
  }, [tokens, sort]);

  const handleSort = (column: string) => {
    setSort(prev => ({
      column,
      direction:
        prev.column === column && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  if (isLoading || isInitialLoading) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-900">
        <div className="text-lg text-white">Loading...</div>
      </div>
    );
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
            {sortedTokens.map((token, index) => (
              <tr
                key={token.id}
                className="hover:bg-gray-800 transition-colors"
              >
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
                      <TableCell token={token} column={column} index={index} />
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {tokens.length === 0 && (
        <div className="text-center py-8 text-gray-400">No data to display</div>
      )}

      <div className="px-4 py-3 bg-gray-800 text-sm text-gray-300">
        <div className="flex items-center justify-between">
          <div>
            Connection: {isConnected ? '🟢 Connected' : '🔴 Disconnected'} |{' '}
            Tokens: {tokens.length}
          </div>
        </div>
      </div>
    </div>
  );
};
