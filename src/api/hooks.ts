import { InfiniteData, useInfiniteQuery } from '@tanstack/react-query';
import { AxiosResponse } from 'axios';

import {
  GetScannerResultParams,
  ScannerApiResponse,
  TokenData,
} from '../scheme/type';
import { convertToTokenData } from '../utils/tokenUtils';
import { getScanner } from './requests';

export const API_KEY_GET_SCANNER = 'API_KEY_GET_SCANNER';

export const useGetScannerInfiniteQuery = (
  baseParams: Omit<GetScannerResultParams, 'page'>
) => {
  return useInfiniteQuery<
    AxiosResponse<ScannerApiResponse>,
    undefined,
    InfiniteData<AxiosResponse<ScannerApiResponse>> & {
      allPages: TokenData[];
      pairs: Record<string, TokenData>;
    }
  >({
    queryKey: [API_KEY_GET_SCANNER, baseParams],
    queryFn: ({ pageParam = 1 }) =>
      getScanner({ ...baseParams, page: pageParam as number }),
    select: data => {
      const [allPages, pairs] = data.pages.reduce<
        [TokenData[], Record<string, TokenData>]
      >(
        (prev, page) => {
          if (page.data.pairs) {
            const convertedTokens = page.data.pairs.map(convertToTokenData);
            const convertedTokensMap = convertedTokens.reduce<
              Record<string, TokenData>
            >((prev, token) => {
              prev[token.pairAddress] = token;
              return prev;
            }, {});

            prev[0].push(...convertedTokens);
            prev[1] = { ...prev[1], ...convertedTokensMap };
          }

          return prev;
        },
        [[], {}]
      );

      return { ...data, allPages, pairs };
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
