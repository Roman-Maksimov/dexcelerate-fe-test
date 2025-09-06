import { FC } from 'react';

import { Table } from '../components/Table';
import { TRENDING_TOKENS_FILTERS } from '../scheme/type';

export const TrendingTokensPage: FC = () => {
  return <Table title="Trending tokens" filters={TRENDING_TOKENS_FILTERS} />;
};
