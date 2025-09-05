import Decimal from 'decimal.js';

import { chainIdToName, ScannerResult, TokenData } from '../scheme/type';

/**
 * Calculate market cap using the priority order from API response
 */
export function calculateMarketCap(result: ScannerResult): number {
  const currentMcap = parseFloat(result.currentMcap);
  const initialMcap = parseFloat(result.initialMcap);
  const pairMcapUsd = parseFloat(result.pairMcapUsd);
  const pairMcapUsdInitial = parseFloat(result.pairMcapUsdInitial);

  if (currentMcap > 0) return currentMcap;
  if (initialMcap > 0) return initialMcap;
  if (pairMcapUsd > 0) return pairMcapUsd;
  if (pairMcapUsdInitial > 0) return pairMcapUsdInitial;
  return 0;
}

/**
 * Convert ScannerResult to TokenData
 */
export function convertToTokenData(result: ScannerResult): TokenData {
  const chain = chainIdToName(result.chainId);
  const priceUsd = new Decimal(result.price);
  const volumeUsd = new Decimal(result.volume);
  const mcap = calculateMarketCap(result);
  const liquidityCurrent = parseFloat(result.liquidity);
  const liquidityChangePc = parseFloat(result.percentChangeInLiquidity);
  const totalSupply = parseFloat(result.token1TotalSupplyFormatted);

  const match = result.price.match(/\.(\d+)$/);
  const decimals = match?.[1]?.length ?? 0;

  return {
    id: result.pairAddress,
    tokenBase: result.token0Symbol,
    tokenName: result.token1Name,
    tokenSymbol: result.token1Symbol,
    tokenAddress: result.token1Address,
    tokenDecimals: decimals,
    pairAddress: result.pairAddress,
    chain,
    exchange: result.virtualRouterType || result.routerAddress,
    priceUsd,
    volumeUsd,
    mcap,
    totalSupply,
    priceChangePcs: {
      '5m': parseFloat(result.diff5M ?? '0'),
      '1h': parseFloat(result.diff1H ?? '0'),
      '6h': parseFloat(result.diff6H ?? '0'),
      '24h': parseFloat(result.diff24H ?? '0'),
    },
    transactions: {
      buys: result.buys || 0,
      sells: result.sells || 0,
    },
    audit: {
      mintable: result.isMintAuthDisabled,
      freezable: result.isFreezeAuthDisabled,
      honeypot: result.honeyPot || false,
      contractVerified: result.contractVerified,
    },
    tokenCreatedTimestamp: new Date(result.age),
    liquidity: {
      current: liquidityCurrent,
      changePc: liquidityChangePc,
    },
    migrationPc: result.migrationProgress
      ? parseFloat(result.migrationProgress)
      : undefined,
    socialLinks: {
      discord: result.discordLink || undefined,
      telegram: result.telegramLink || undefined,
      twitter: result.twitterLink || undefined,
      website: result.webLink || undefined,
    },
    dexPaid: result.dexPaid,
  };
}

/**
 * Format number with appropriate suffix (K, M, B)
 */
export function formatNumber(num: number | string | Decimal): string {
  const decimal = new Decimal(num);

  if (decimal.greaterThanOrEqualTo(1e9)) {
    return decimal.div(1e9).toFixed(1) + 'B';
  }
  if (decimal.greaterThanOrEqualTo(1e6)) {
    return decimal.div(1e6).toFixed(1) + 'M';
  }
  if (decimal.greaterThanOrEqualTo(1e3)) {
    return decimal.div(1e3).toFixed(1) + 'K';
  }
  return decimal.toSignificantDigits(2).toString();
}

/**
 * Format price with appropriate decimal places and subscript notation for leading zeros
 */
export function formatPrice(
  price: number | string | Decimal,
  decimals = 20
): string {
  const decimal = new Decimal(price);

  if (decimal.greaterThan(0)) {
    return formatPriceWithSubscript(
      decimal.toSignificantDigits(decimals || 0).toString()
    );
  }

  return formatPriceWithSubscript(decimal.toFixed(0));
}

/**
 * Format very small numbers with subscript notation for leading zeros
 * Example: 0.000321 -> 0.0₃321, 0.0000321 -> 0.0₄321
 */
function formatPriceWithSubscript(price: string): string {
  const match = price.match(/^([0-1])\.(0+)(\d+)$/);

  if (!match) {
    return price;
  }

  const leadingZeros = match[2];
  const significantDigits = match[3];

  // Only use subscript notation if there are 3 or more leading zeros
  if (leadingZeros && leadingZeros.length >= 3) {
    const subscriptNumber = leadingZeros.length;
    const subscript = getSubscriptNumber(subscriptNumber);
    return `${match[1]}.0${subscript}${significantDigits}`;
  }

  // For 2 or fewer leading zeros, use regular formatting
  return price;
}

/**
 * Convert number to subscript notation
 */
function getSubscriptNumber(num: number): string {
  const subscripts = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
  return num
    .toString()
    .split('')
    .map(digit => subscripts[parseInt(digit)])
    .join('');
}

/**
 * Format percentage with color indication
 */
export function formatPercentage(percentage: number): {
  text: string;
  isPositive: boolean;
} {
  // Handle NaN, Infinity, and invalid numbers
  if (!isFinite(percentage) || isNaN(percentage) || percentage === 0) {
    return { text: '-', isPositive: false };
  }

  const isPositive = percentage > 0;
  const text = `${isPositive ? '+' : ''}${percentage.toFixed(2)}%`;
  return { text, isPositive };
}

/**
 * Calculate age in human readable format
 */
export function formatAge(timestamp: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - timestamp.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `${diffDays}d`;
  }
  if (diffHours > 0) {
    return `${diffHours}h`;
  }
  return `${diffMinutes}m`;
}
