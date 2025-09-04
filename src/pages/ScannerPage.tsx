import { FC } from 'react';

import { Table } from '../components/Table';

export const ScannerPage: FC = () => {
  return (
    <div className="p-4">
      <h1>Trending Tokens</h1>
      <Table />
    </div>
  );
};
