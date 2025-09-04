import { FC } from 'react';

import { TokenData, TokenTableColumn } from '../scheme/type';
import { formatAge, formatNumber, formatPrice } from '../utils/tokenUtils';
import { TableColoredNumber } from './TableColoredNumber';

export interface TableCellProps {
  token: TokenData;
  column: TokenTableColumn;
  index: number;
}

export const TableCell: FC<TableCellProps> = ({ token, column, index }) => {
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
