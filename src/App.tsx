import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FC } from 'react';

const queryClient = new QueryClient();

export const App: FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <div>123</div>
    </QueryClientProvider>
  );
};
