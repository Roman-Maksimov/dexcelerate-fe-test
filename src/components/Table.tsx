import { FC } from 'react';

import { useGetScannerQuery } from '../api/hooks';

export const Table: FC = () => {
  const { data } = useGetScannerQuery({});

  return null;
};
