import React, { FC } from 'react';

import { Skeleton } from '../ui/skeleton';
import { COLUMNS } from './columns';

export const TableRowSkeleton: FC = () => {
  return (
    <tr className="hover:bg-gray-800 transition-colors">
      {COLUMNS.map(column => (
        <td key={column.key}>
          <div className="p-2" style={{ width: column.width }}>
            <Skeleton className="h-[27px] w-full bg-gray-700" />
          </div>
        </td>
      ))}
    </tr>
  );
};
