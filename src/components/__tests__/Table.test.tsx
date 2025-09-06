import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import Decimal from 'decimal.js';
import * as React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TokenData } from '../../scheme/type';
import { Table } from '../Table';
import { TableFiltersProps } from '../TableFilters';
import { TableRowProps } from '../TableRow';

// Mock the UI components
vi.mock('../../ui/button', () => ({
  Button: ({ children, onClick, ...props }: React.ComponentProps<'button'>) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('../../ui/skeleton', () => ({
  Skeleton: ({ className }: React.ComponentProps<'div'>) => (
    <div className={className} data-testid="skeleton" />
  ),
}));

vi.mock('../TableRow', () => ({
  TableRow: ({ token }: TableRowProps) => (
    <tr>
      <td>{token.tokenSymbol}</td>
      <td>{token.priceUsd.toString()}</td>
    </tr>
  ),
}));

vi.mock('../TableRowSkeleton', () => ({
  TableRowSkeleton: () => (
    <tr>
      <td colSpan={10}>
        <div data-testid="table-row-skeleton">Loading...</div>
      </td>
    </tr>
  ),
}));

vi.mock('../TableFilters', () => ({
  TableFilters: ({
    filters,
    onFiltersChange,
    onClearFilters,
  }: TableFiltersProps) => (
    <div data-testid="table-filters">
      <button onClick={() => onFiltersChange({ ...filters, chain: 'ETH' })}>
        Set ETH Filter
      </button>
      <button onClick={onClearFilters}>Clear Filters</button>
    </div>
  ),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  // eslint-disable-next-line react/display-name
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const mockTokens: TokenData[] = [
  {
    id: '0x123',
    tokenBase: 'ETH',
    tokenName: 'Test Token 1',
    tokenSymbol: 'TEST1',
    tokenAddress: '0x456',
    tokenDecimals: 18,
    pairAddress: '0x123',
    chain: 'ETH',
    exchange: 'UniswapV2',
    priceUsd: new Decimal('0.001'),
    volumeUsd: new Decimal('10000'),
    mcap: 1000000,
    totalSupply: 1000000,
    priceChangePcs: {
      '5m': 5.5,
      '1h': 10.2,
      '6h': -2.1,
      '24h': 15.8,
    },
    transactions: {
      buys: 100,
      sells: 50,
    },
    audit: {
      mintable: true,
      freezable: false,
      honeypot: false,
      contractVerified: true,
    },
    tokenCreatedTimestamp: new Date('2024-01-01'),
    liquidity: {
      current: 50000,
      changePc: 2.5,
    },
    migrationPc: 75.5,
    socialLinks: {
      discord: 'https://discord.gg/test1',
      telegram: 'https://t.me/test1',
      twitter: 'https://twitter.com/test1',
      website: 'https://test1.com',
    },
    dexPaid: true,
  },
];

describe('Table - Simple Tests', () => {
  const defaultProps = {
    data: {
      pages: [
        {
          data: {
            pairs: mockTokens,
          },
        },
      ],
      allPages: mockTokens,
      pairs: {
        '0x123': mockTokens[0],
      },
    },
    hasNextPage: true,
    fetchNextPage: vi.fn(),
    isFetchingNextPage: false,
    isLoading: false,
    sort: {
      column: 'volumeUsd',
      direction: 'desc' as const,
    },
    handleSort: vi.fn(),
    filters: {
      chain: null,
      minVolume: null,
      maxAge: null,
      minMcap: null,
      excludeHoneypots: false,
    },
    handleFiltersChange: vi.fn(),
    handleClearFilters: vi.fn(),
    loadMoreRef: { current: null },
    earlyLoadRef: { current: null },
    isConnected: true,
    isConnecting: false,
    reconnectCountdown: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    render(<Table {...defaultProps} />, { wrapper: createWrapper() });
    expect(screen.getByTestId('table-filters')).toBeInTheDocument();
  });

  it('should render table filters', () => {
    render(<Table {...defaultProps} />, { wrapper: createWrapper() });
    expect(screen.getByTestId('table-filters')).toBeInTheDocument();
  });
});
