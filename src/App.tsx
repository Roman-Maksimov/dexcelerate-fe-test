import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FC } from 'react';

import { Table } from './components/Table';

const queryClient = new QueryClient();

export const App: FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <div>
        <Table />
      </div>
    </QueryClientProvider>
  );
};
