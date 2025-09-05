import { FC } from 'react';

interface HeaderProps {
  title?: string;
  isConnected?: boolean;
  isConnecting?: boolean;
  reconnectCountdown?: number | null;
  tokenCount?: number;
  totalCount?: number;
}

export const Header: FC<HeaderProps> = ({
  title,
  isConnected,
  isConnecting,
  reconnectCountdown,
  tokenCount,
  totalCount,
}) => {
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
        </div>
      </div>
    </div>
  );
};
