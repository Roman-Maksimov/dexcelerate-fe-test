import { useQuery } from '@tanstack/react-query';
import { AxiosResponse } from 'axios';

import { GetScannerResultParams, ScannerApiResponse } from '../scheme/type';
import { getScanner } from './requests';
import { UseQueryRequestOptions } from './types';

export const API_KEY_GET_SCANNER = 'API_KEY_GET_SCANNER';

export const useGetScannerQuery = (
  params: GetScannerResultParams,
  options?: UseQueryRequestOptions<AxiosResponse<ScannerApiResponse>>
) => {
  return useQuery<AxiosResponse<ScannerApiResponse>>({
    queryKey: [API_KEY_GET_SCANNER, params],
    queryFn: () => getScanner(params),
    ...options,
  });
};
