import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { AxiosResponse } from 'axios';

import {
  GetScannerResultParams,
  ScannerApiResponse,
  TokenData,
} from '../scheme/type';
import { convertToTokenData } from '../utils/tokenUtils';
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

export const useGetScannerInfiniteQuery = (
  baseParams: Omit<GetScannerResultParams, 'page'>
) => {
  return useInfiniteQuery<
    AxiosResponse<ScannerApiResponse & { allPages: TokenData[] }>
  >({
    queryKey: [API_KEY_GET_SCANNER, baseParams],
    queryFn: ({ pageParam = 1 }) =>
      getScanner({ ...baseParams, page: pageParam as number }),
    select: data => {
      const allPages = data.pages.reduce<TokenData[]>((prev, page) => {
        if (page.data.pairs) {
          const convertedTokens = page.data.pairs.map(convertToTokenData);
          prev.push(...convertedTokens);
        }

        return prev;
      }, []);

      return { ...data, allPages };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages, lastPageParam) => {
      // If we got less than 100 items, we've reached the end
      const currentPageItems = lastPage.data.pairs?.length || 0;
      const itemsPerPage = 100;

      if (currentPageItems < itemsPerPage) {
        return undefined; // No more pages
      }

      return (lastPageParam as number) + 1; // Next page
    },
  });
};
