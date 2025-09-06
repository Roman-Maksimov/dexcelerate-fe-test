import { FC } from 'react';

import { Table } from '../components/Table';
import { NEW_TOKENS_FILTERS } from '../scheme/type';

export const NewTokensPage: FC = () => {
  return <Table title="New tokens" filters={NEW_TOKENS_FILTERS} />;
};
