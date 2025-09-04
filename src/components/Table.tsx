import { FC, useEffect, useMemo, useState } from 'react';

import { useGetScannerQuery } from '../api/hooks';
import { useWebSocket } from '../hooks/useWebSocket';
import {
  TokenData,
  TokenTableColumn,
  TokenTableSort,
  TRENDING_TOKENS_FILTERS,
} from '../scheme/type';
import {
  convertToTokenData,
  formatAge,
  formatNumber,
  formatPercentage,
  formatPrice,
} from '../utils/tokenUtils';

const COLUMNS: TokenTableColumn[] = [
  { key: 'token', label: 'Token', sortable: true, width: '200px' },
  { key: 'exchange', label: 'Exchange', sortable: true, width: '120px' },
  {
    key: 'priceUsd',
    label: 'Price',
    sortable: true,
    width: '100px',
    align: 'right',
  },
  {
    key: 'mcap',
    label: 'Market Cap',
    sortable: true,
    width: '120px',
    align: 'right',
  },
  {
    key: 'volumeUsd',
    label: 'Volume 24h',
    sortable: true,
    width: '120px',
    align: 'right',
  },
  {
    key: 'priceChangePcs',
    label: 'Price Change',
    sortable: false,
    width: '200px',
    align: 'center',
  },
  {
    key: 'tokenCreatedTimestamp',
    label: 'Age',
    sortable: true,
    width: '80px',
    align: 'center',
  },
  {
    key: 'transactions',
    label: 'Buys/Sells',
    sortable: false,
    width: '120px',
    align: 'center',
  },
  {
    key: 'liquidity',
    label: 'Liquidity',
    sortable: true,
    width: '120px',
    align: 'right',
  },
  {
    key: 'audit',
    label: 'Audit',
    sortable: false,
    width: '100px',
    align: 'center',
  },
];

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

  const getNestedValue = (obj: TokenData, path: string) => {
    return path
      .split('.')
      .reduce(
        (current: unknown, key) => (current as Record<string, unknown>)?.[key],
        obj
      );
  };

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

  const renderTokenCell = (token: TokenData, column: TokenTableColumn) => {
    switch (column.key) {
      case 'token':
        return (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
              <span className="text-xs font-bold">
                {token.tokenSymbol.charAt(0)}
              </span>
            </div>
            <div>
              <div className="font-medium">{token.tokenName}</div>
              <div className="text-sm text-gray-500">
                {token.tokenSymbol} • {token.chain}
              </div>
            </div>
          </div>
        );

      case 'exchange':
        return <span className="text-sm">{token.exchange}</span>;

      case 'priceUsd':
        return (
          <span className="font-mono">${formatPrice(token.priceUsd)}</span>
        );

      case 'mcap':
        return <span className="font-mono">${formatNumber(token.mcap)}</span>;

      case 'volumeUsd':
        return (
          <span className="font-mono">${formatNumber(token.volumeUsd)}</span>
        );

      case 'priceChangePcs':
        return (
          <div className="flex space-x-2 text-xs">
            {Object.entries(token.priceChangePcs).map(([timeframe, value]) => {
              const { text, isPositive } = formatPercentage(value);
              return (
                <span
                  key={timeframe}
                  className={`px-1 py-0.5 rounded ${
                    isPositive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {timeframe}: {text}
                </span>
              );
            })}
          </div>
        );

      case 'tokenCreatedTimestamp':
        return (
          <span className="text-sm">
            {formatAge(token.tokenCreatedTimestamp)}
          </span>
        );

      case 'transactions':
        return (
          <div className="text-sm">
            <div className="text-green-600">{token.transactions.buys}</div>
            <div className="text-red-600">{token.transactions.sells}</div>
          </div>
        );

      case 'liquidity': {
        const { text: liquidityText, isPositive: liquidityPositive } =
          formatPercentage(token.liquidity.changePc);
        return (
          <div>
            <div className="font-mono">
              ${formatNumber(token.liquidity.current)}
            </div>
            <div
              className={`text-xs ${
                liquidityPositive ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {liquidityText}
            </div>
          </div>
        );
      }

      case 'audit':
        return (
          <div className="flex space-x-1">
            {token.audit.contractVerified && (
              <span
                className="w-2 h-2 bg-green-500 rounded-full"
                title="Verified"
              />
            )}
            {!token.audit.honeypot && (
              <span
                className="w-2 h-2 bg-blue-500 rounded-full"
                title="Not Honeypot"
              />
            )}
            {token.audit.mintable && (
              <span
                className="w-2 h-2 bg-yellow-500 rounded-full"
                title="Mintable"
              />
            )}
          </div>
        );

      default:
        return <span>{String(getNestedValue(token, column.key))}</span>;
    }
  };

  if (isLoading || isInitialLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {COLUMNS.map(column => (
                <th
                  key={column.key}
                  className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
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
                      <span className="ml-1">
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
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedTokens.map(token => (
              <tr key={token.id} className="hover:bg-gray-50">
                {COLUMNS.map(column => (
                  <td
                    key={column.key}
                    className={`px-4 py-4 whitespace-nowrap text-sm ${
                      column.align === 'right'
                        ? 'text-right'
                        : column.align === 'center'
                          ? 'text-center'
                          : 'text-left'
                    }`}
                  >
                    {renderTokenCell(token, column)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {tokens.length === 0 && (
        <div className="text-center py-8 text-gray-500">No data to display</div>
      )}

      <div className="px-4 py-3 bg-gray-50 text-sm text-gray-500">
        Connection: {isConnected ? '🟢 Connected' : '🔴 Disconnected'} |{' '}
        Tokens: {tokens.length}
      </div>
    </div>
  );
};
