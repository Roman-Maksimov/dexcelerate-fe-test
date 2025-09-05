import { FC } from 'react';

import { Table } from '../components/Table';

export const ScannerPage: FC = () => {
  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <Table title="Trending tokens" />
    </div>
  );
};
