import { FC } from 'react';

import { usePrevious } from '../hooks/usePrevious';
import { TokenData, TokenTableColumn } from '../scheme/type';
import { cn } from '../utils/cn';
import { formatAge, formatNumber, formatPrice } from '../utils/tokenUtils';
import { TableColoredNumber } from './TableColoredNumber';

export interface TableCellProps {
  token: TokenData;
  column: TokenTableColumn;
  index: number;
}

const getColumnValue = (token: TokenData, column: TokenTableColumn) => {
  switch (column.key) {
    case 'priceUsd':
      return token.priceUsd;
    case 'mcap':
      return token.mcap;
    case 'volumeUsd':
      return token.volumeUsd;
    case 'priceChange5m':
      return token.priceChangePcs['5m'];
    case 'priceChange1h':
      return token.priceChangePcs['1h'];
    case 'priceChange6h':
      return token.priceChangePcs['6h'];
    case 'priceChange2h':
      return token.priceChangePcs['24h'];
    case 'buys':
      return token.transactions.buys;
    case 'sells':
      return token.transactions.sells;
    case 'audit':
      return token.audit;
    default:
      return undefined;
  }
};

export const TableCell: FC<TableCellProps> = ({ token, column, index }) => {
  const value = getColumnValue(token, column);
  const prevValue = usePrevious(value);

  switch (column.key) {
    case 'rank':
      return <span className="text-gray-400 text-sm">{index + 1}</span>;

    case 'token':
      return (
        <div className="space-x-3">
          <div>
            <span className="font-bold text-white">{token.tokenSymbol}</span>
            <span className="font-normal text-gray-400">
              {' '}
              / {token.tokenBase}
            </span>
          </div>
          <div className="text-gray-400">{token.chain}</div>
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
        <span
          className={cn('font-mono text-white', {
            'animate-highlight-text': prevValue !== value,
            'animate-highlight-text-2': prevValue === value,
          })}
        >
          ${formatPrice(token.priceUsd, token.tokenDecimals)}
        </span>
      );

    case 'mcap':
      return (
        <span
          className={cn('font-mono text-white', {
            'animate-highlight-text': prevValue !== value,
            'animate-highlight-text-2': prevValue === value,
          })}
        >
          ${formatNumber(token.mcap)}
        </span>
      );

    case 'volumeUsd':
      return (
        <span
          className={cn('font-mono text-white', {
            'animate-highlight-text': prevValue !== value,
            'animate-highlight-text-2': prevValue === value,
          })}
        >
          ${formatNumber(token.volumeUsd)}
        </span>
      );

    case 'priceChange5m':
      return (
        <div
          className={cn('text-center', {
            'animate-highlight-text': prevValue !== value,
            'animate-highlight-text-2': prevValue === value,
          })}
        >
          <TableColoredNumber value={token.priceChangePcs['5m']} />
        </div>
      );

    case 'priceChange1h':
      return (
        <div
          className={cn('text-center', {
            'animate-highlight-text': prevValue !== value,
            'animate-highlight-text-2': prevValue === value,
          })}
        >
          <TableColoredNumber value={token.priceChangePcs['1h']} />
        </div>
      );

    case 'priceChange6h':
      return (
        <div
          className={cn('text-center', {
            'animate-highlight-text': prevValue !== value,
            'animate-highlight-text-2': prevValue === value,
          })}
        >
          <TableColoredNumber value={token.priceChangePcs['6h']} />
        </div>
      );

    case 'priceChange24h':
      return (
        <div
          className={cn('text-center', {
            'animate-highlight-text': prevValue !== value,
            'animate-highlight-text-2': prevValue === value,
          })}
        >
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
        <div
          className={cn('text-center', {
            'animate-highlight-text': prevValue !== value,
            'animate-highlight-text-2': prevValue === value,
          })}
        >
          <div className="text-green-400 font-mono">
            {formatNumber(token.transactions.buys)}
          </div>
        </div>
      );

    case 'sells':
      return (
        <div
          className={cn('text-center', {
            'animate-highlight-text': prevValue !== value,
            'animate-highlight-text-2': prevValue === value,
          })}
        >
          <div className="text-red-400 font-mono">
            {formatNumber(token.transactions.sells)}
          </div>
        </div>
      );

    case 'liquidity': {
      return (
        <div
          className={cn('text-right', {
            'animate-highlight-text': prevValue !== value,
            'animate-highlight-text-2': prevValue === value,
          })}
        >
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
          <div
            className={cn('flex space-x-2', {
              'animate-highlight-text': prevValue !== value,
              'animate-highlight-text-2': prevValue === value,
            })}
          >
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

export function getNestedValue(obj: TokenData, path: string) {
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
}
