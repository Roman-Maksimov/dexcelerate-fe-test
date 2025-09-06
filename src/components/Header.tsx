import { FC } from 'react';

import { TokenData } from '../scheme/type';
import { Button } from '../ui/button';
import { exportTokensToCSV } from '../utils/csvExport';

interface HeaderProps {
  title?: string;
  isConnected?: boolean;
  isConnecting?: boolean;
  reconnectCountdown?: number | null;
  tokenCount?: number;
  totalCount?: number;
  tokens?: TokenData[];
}

export const Header: FC<HeaderProps> = ({
  title,
  isConnected,
  isConnecting,
  reconnectCountdown,
  tokenCount,
  totalCount,
  tokens,
}) => {
  const handleExportCSV = () => {
    if (tokens && tokens.length > 0) {
      const timestamp = new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/:/g, '-');
      const filename = `tokens-export-${timestamp}.csv`;
      exportTokensToCSV(tokens, filename);
    }
  };
  return (
    <div className="bg-gray-800 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        <div className="flex items-center space-x-6 text-sm text-gray-300">
          <div className="flex items-center space-x-2">
            <span>Connection:</span>
            <span
              className={`flex items-center space-x-1 ${
                isConnected
                  ? 'text-green-400'
                  : isConnecting
                    ? 'text-yellow-400'
                    : 'text-red-400'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-current"></span>
              <span>
                {isConnected
                  ? 'Connected'
                  : isConnecting
                    ? 'Establishing connection...'
                    : reconnectCountdown !== null
                      ? `Reconnecting in ${reconnectCountdown}s...`
                      : 'Not connected'}
              </span>
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span>
              Tokens: {tokenCount} / {totalCount}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={handleExportCSV}
              disabled={!tokens || tokens.length === 0}
              variant="ghost"
              size="sm"
              className="h-8 px-3 text-xs text-gray-400 hover:text-white hover:bg-gray-700/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg
                className="w-3 h-3 mr-1.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Export
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
