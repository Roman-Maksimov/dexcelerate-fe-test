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
  const priceUsd = parseFloat(result.price);
  const volumeUsd = parseFloat(result.volume);
  const mcap = calculateMarketCap(result);
  const liquidityCurrent = parseFloat(result.liquidity);
  const liquidityChangePc = parseFloat(result.percentChangeInLiquidity);

  return {
    id: result.pairAddress,
    tokenName: result.token1Name,
    tokenSymbol: result.token1Symbol,
    tokenAddress: result.token1Address,
    pairAddress: result.pairAddress,
    chain,
    exchange: result.virtualRouterType || result.routerAddress,
    priceUsd,
    volumeUsd,
    mcap,
    priceChangePcs: {
      '5m': parseFloat(result.diff5M),
      '1h': parseFloat(result.diff1H),
      '6h': parseFloat(result.diff6H),
      '24h': parseFloat(result.diff24H),
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
export function formatNumber(num: number): string {
  if (num >= 1e9) {
    return (num / 1e9).toFixed(1) + 'B';
  }
  if (num >= 1e6) {
    return (num / 1e6).toFixed(1) + 'M';
  }
  if (num >= 1e3) {
    return (num / 1e3).toFixed(1) + 'K';
  }
  return num.toFixed(2);
}

/**
 * Format price with appropriate decimal places
 */
export function formatPrice(price: number): string {
  if (price >= 1) {
    return price.toFixed(2);
  }
  if (price >= 0.01) {
    return price.toFixed(4);
  }
  return price.toExponential(2);
}

/**
 * Format percentage with color indication
 */
export function formatPercentage(percentage: number): {
  text: string;
  isPositive: boolean;
} {
  const isPositive = percentage >= 0;
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
