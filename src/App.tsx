import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FC } from 'react';
import { BrowserRouter, Outlet, Route, Routes } from 'react-router';

import { MainLayout } from './layouts/MainLayout';
import { NewTokensPage } from './pages/NewTokensPage';
import { TrendingTokensPage } from './pages/TrendingTokensPage';

const queryClient = new QueryClient();

export const App: FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route
            element={
              <MainLayout>
                <Outlet />
              </MainLayout>
            }
          >
            <Route index element={<TrendingTokensPage />} />
            <Route path="new-tokens" element={<NewTokensPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
};
