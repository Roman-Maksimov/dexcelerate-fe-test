import { FC } from 'react';

import { useGetScannerQuery } from '../api/hooks';

export const Table: FC = () => {
  const { data } = useGetScannerQuery({});

  // TODO: use @tanstack/react-table

  return null;
};
