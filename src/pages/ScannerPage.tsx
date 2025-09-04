import { FC } from 'react';

import { Table } from '../components/Table';

export const ScannerPage: FC = () => {
  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6">Trending Tokens</h1>
        <Table />
      </div>
    </div>
  );
};
