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
  formatPrice,
} from '../utils/tokenUtils';
import { TableColoredNumber } from './TableColoredNumber';

const COLUMNS: TokenTableColumn[] = [
  { key: 'rank', label: '#', sortable: false, width: '40px', align: 'left' },
  { key: 'token', label: 'Token', sortable: true, width: '160px' },
  { key: 'exchange', label: 'Exchange', sortable: true, width: '320px' },
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
    key: 'tokenCreatedTimestamp',
    label: 'Time',
    sortable: true,
    width: '80px',
    align: 'center',
  },
  {
    key: 'priceChange5m',
    label: '5m',
    sortable: true,
    width: '100px',
    align: 'center',
  },
  {
    key: 'priceChange1h',
    label: '1h',
    sortable: true,
    width: '100px',
    align: 'center',
  },
  {
    key: 'priceChange6h',
    label: '6h',
    sortable: true,
    width: '100px',
    align: 'center',
  },
  {
    key: 'priceChange24h',
    label: '24h',
    sortable: true,
    width: '100px',
    align: 'center',
  },
  {
    key: 'buys',
    label: 'Buys',
    sortable: true,
    width: '80px',
    align: 'center',
  },
  {
    key: 'sells',
    label: 'Sells',
    sortable: true,
    width: '80px',
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
    width: '250px',
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
    // Handle special cases for buys and sells
    if (path === 'buys') {
      return obj.transactions.buys;
    }
    if (path === 'sells') {
      return obj.transactions.sells;
    }

    // Handle special cases for price changes
    if (path === 'priceChange5m') {
      return obj.priceChangePcs['5m'];
    }
    if (path === 'priceChange1h') {
      return obj.priceChangePcs['1h'];
    }
    if (path === 'priceChange6h') {
      return obj.priceChangePcs['6h'];
    }
    if (path === 'priceChange24h') {
      return obj.priceChangePcs['24h'];
    }

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

  const renderTokenCell = (
    token: TokenData,
    column: TokenTableColumn,
    index: number
  ) => {
    switch (column.key) {
      case 'rank':
        return <span className="text-gray-400 text-sm">{index + 1}</span>;

      case 'token':
        return (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
              <span className="font-bold text-white">
                {token.tokenSymbol.charAt(0)}
              </span>
            </div>
            <div>
              <div className="font-medium text-white">{token.tokenName}</div>
              <div className="text-gray-400">
                {token.tokenSymbol} • {token.chain}
              </div>
            </div>
          </div>
        );

      case 'exchange':
        return (
          <span className="text-white text-xs" title={token.exchange}>
            {token.exchange}
          </span>
        );

      case 'priceUsd':
        return (
          <span className="font-mono text-white">
            ${formatPrice(token.priceUsd)}
          </span>
        );

      case 'mcap':
        return (
          <span className="font-mono text-white">
            ${formatNumber(token.mcap)}
          </span>
        );

      case 'volumeUsd':
        return (
          <span className="font-mono text-white">
            ${formatNumber(token.volumeUsd)}
          </span>
        );

      case 'priceChange5m':
        return (
          <div className="text-center">
            <TableColoredNumber value={token.priceChangePcs['5m']} />
          </div>
        );

      case 'priceChange1h':
        return (
          <div className="text-center">
            <TableColoredNumber value={token.priceChangePcs['1h']} />
          </div>
        );

      case 'priceChange6h':
        return (
          <div className="text-center">
            <TableColoredNumber value={token.priceChangePcs['6h']} />
          </div>
        );

      case 'priceChange24h':
        return (
          <div className="text-center">
            <TableColoredNumber value={token.priceChangePcs['24h']} />
          </div>
        );

      case 'tokenCreatedTimestamp':
        return (
          <span className="text-white">
            {formatAge(token.tokenCreatedTimestamp)}
          </span>
        );

      case 'buys':
        return (
          <div className="text-center">
            <div className="text-green-400 font-mono">
              {formatNumber(token.transactions.buys)}
            </div>
          </div>
        );

      case 'sells':
        return (
          <div className="text-center">
            <div className="text-red-400 font-mono">
              {formatNumber(token.transactions.sells)}
            </div>
          </div>
        );

      case 'liquidity': {
        return (
          <div className="text-right">
            <div className="font-mono text-white">
              ${formatNumber(token.liquidity.current)}
            </div>
            <div className="text-xs text-gray-400">
              {formatNumber(token.transactions.buys)}/
              {formatNumber(token.transactions.sells)}
            </div>
          </div>
        );
      }

      case 'audit':
        return (
          <div className="flex flex-col items-center space-y-1">
            <div className="flex space-x-2">
              <div className="flex flex-col items-center">
                <div
                  className={`w-3 h-3 rounded-full ${
                    token.audit.mintable ? 'bg-red-500' : 'bg-green-500'
                  }`}
                />
                <span className="text-xs text-gray-400">Mintable</span>
              </div>
              <div className="flex flex-col items-center">
                <div
                  className={`w-3 h-3 rounded-full ${
                    token.audit.freezable ? 'bg-red-500' : 'bg-green-500'
                  }`}
                />
                <span className="text-xs text-gray-400">Freezeable</span>
              </div>
              <div className="flex flex-col items-center">
                <div
                  className={`w-3 h-3 rounded-full ${
                    token.audit.contractVerified ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
                <span className="text-xs text-gray-400">Burned</span>
              </div>
              <div className="flex flex-col items-center">
                <div
                  className={`w-3 h-3 rounded-full ${
                    token.audit.honeypot ? 'bg-red-500' : 'bg-green-500'
                  }`}
                />
                <span className="text-xs text-gray-400">Honeypot</span>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <span className="text-white">
            {String(getNestedValue(token, column.key))}
          </span>
        );
    }
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
                      {renderTokenCell(token, column, index)}
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
