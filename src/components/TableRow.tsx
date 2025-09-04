import React, { FC } from 'react';

import { TokenData } from '../scheme/type';
import { COLUMNS } from './columns';
import { TableCell } from './TableCell';

export interface TableRowProps {
  token: TokenData;
  index: number;
  shouldShowEarlyTrigger: boolean;
  earlyLoadRef: React.RefObject<HTMLDivElement | null>;
}

export const TableRow: FC<TableRowProps> = ({
  token,
  index,
  shouldShowEarlyTrigger,
  earlyLoadRef,
}) => {
  return (
    <React.Fragment key={`${token.exchange}-${token.id}`}>
      {shouldShowEarlyTrigger && (
        <tr>
          <td colSpan={COLUMNS.length} className="p-0">
            <div ref={earlyLoadRef} className="h-1 w-full" />
          </td>
        </tr>
      )}
      <tr className="hover:bg-gray-800 transition-colors">
        {COLUMNS.map(column => (
          <td
            key={column.key}
            className={`${
              column.align === 'right'
                ? 'text-right'
                : column.align === 'center'
                  ? 'text-center'
                  : 'text-left'
            }`}
          >
            <div
              className="p-2 text-xs text-ellipsis overflow-hidden whitespace-nowrap"
              style={{ width: column.width }}
            >
              <TableCell token={token} column={column} index={index} />
            </div>
          </td>
        ))}
      </tr>
    </React.Fragment>
  );
};
