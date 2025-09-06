import { TokenData } from '../scheme/type';

/**
 * Converts token data to CSV format
 */
export function exportTokensToCSV(
  tokens: TokenData[],
  filename: string = 'tokens.csv'
): void {
  if (!tokens || tokens.length === 0) {
    console.warn('No data to export');
    return;
  }

  // CSV headers
  const headers = [
    'Rank',
    'Token Name',
    'Token Symbol',
    'Token Address',
    'Exchange',
    'Price (USD)',
    'Market Cap',
    'Volume 24h',
    'Time',
    '5m Change (%)',
    '1h Change (%)',
    '6h Change (%)',
    '24h Change (%)',
    'Buys',
    'Sells',
    'Liquidity',
    'Mintable',
    'Freezable',
    'Honeypot',
    'Contract Verified',
    'Chain',
    'Pair Address',
  ];

  // Convert token data to CSV rows
  const csvRows = tokens.map((token, index) => [
    (index + 1).toString(), // Rank
    `"${token.tokenName}"`, // Token Name (quoted for safety)
    `"${token.tokenSymbol}"`, // Token Symbol
    token.tokenAddress, // Token Address
    token.exchange, // Exchange
    token.priceUsd.toString(), // Price (USD)
    token.mcap.toString(), // Market Cap
    token.volumeUsd.toString(), // Volume 24h
    token.tokenCreatedTimestamp.toISOString(), // Time
    token.priceChangePcs['5m'].toString(), // 5m Change
    token.priceChangePcs['1h'].toString(), // 1h Change
    token.priceChangePcs['6h'].toString(), // 6h Change
    token.priceChangePcs['24h'].toString(), // 24h Change
    token.transactions.buys.toString(), // Buys
    token.transactions.sells.toString(), // Sells
    token.liquidity.current.toString(), // Liquidity
    token.audit.mintable ? 'Yes' : 'No', // Mintable
    token.audit.freezable ? 'Yes' : 'No', // Freezable
    token.audit.honeypot ? 'Yes' : 'No', // Honeypot
    token.audit.contractVerified ? 'Yes' : 'No', // Contract Verified
    token.chain, // Chain
    token.pairAddress, // Pair Address
  ]);

  // Combine headers and data
  const csvContent = [
    headers.join(','),
    ...csvRows.map(row => row.join(',')),
  ].join('\n');

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

/**
 * Formats date for display in CSV
 */
export function formatDateForCSV(date: Date): string {
  return date.toLocaleString('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
