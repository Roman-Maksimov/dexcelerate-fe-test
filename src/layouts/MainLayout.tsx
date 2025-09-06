import { FC, PropsWithChildren } from 'react';
import { Link, useLocation } from 'react-router';

import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';

export const MainLayout: FC<PropsWithChildren> = ({ children }) => {
  const location = useLocation();

  // Определяем активную вкладку на основе текущего пути
  const activeTab =
    location.pathname === '/new-tokens' ? 'new-tokens' : 'trending';

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <Tabs value={activeTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="trending" asChild>
            <Link to="/">Trending tokens</Link>
          </TabsTrigger>
          <TabsTrigger value="new-tokens" asChild>
            <Link to="/new-tokens">New Tokens</Link>
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="mt-6">{children}</div>
    </div>
  );
};
