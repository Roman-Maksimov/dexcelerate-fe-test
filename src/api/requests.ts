import { GetScannerResultParams, ScannerApiResponse } from '../scheme/type';
import client from './client';

export const API_BASE_PATH = '/api';

export const getScanner = (params: GetScannerResultParams) => {
  return client.get<ScannerApiResponse>(`${API_BASE_PATH}/scanner`, { params });
};
