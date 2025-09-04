import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FC } from 'react';

import { ScannerPage } from './pages/ScannerPage';

const queryClient = new QueryClient();

export const App: FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ScannerPage />
    </QueryClientProvider>
  );
};
