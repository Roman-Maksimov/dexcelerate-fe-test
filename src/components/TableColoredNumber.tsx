import { FC } from 'react';

import { formatPercentage } from '../utils/tokenUtils';

export interface TableColoredNumberProps {
  value: number;
}

export const TableColoredNumber: FC<TableColoredNumberProps> = ({ value }) => {
  const { text, isPositive } = formatPercentage(value);

  return (
    <div
      className={`px-1 py-0.5 rounded ${
        isPositive
          ? 'text-green-400'
          : value === 0
            ? 'text-gray-400'
            : 'text-red-400'
      }`}
      title="5 minutes change"
    >
      {text}
    </div>
  );
};
