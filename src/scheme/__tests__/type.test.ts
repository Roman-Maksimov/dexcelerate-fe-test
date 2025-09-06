import { describe, expect, it } from 'vitest';

import {
  chainIdToName,
  NEW_TOKENS_FILTERS,
  TRENDING_TOKENS_FILTERS,
} from '../type';

describe('type utilities', () => {
  describe('chainIdToName', () => {
    it('should convert chain ID 1 to ETH', () => {
      expect(chainIdToName(1)).toBe('ETH');
    });

    it('should convert chain ID 56 to BSC', () => {
      expect(chainIdToName(56)).toBe('BSC');
    });

    it('should convert chain ID 8453 to BASE', () => {
      expect(chainIdToName(8453)).toBe('BASE');
    });

    it('should convert chain ID 900 to SOL', () => {
      expect(chainIdToName(900)).toBe('SOL');
    });

    it('should default to ETH for unknown chain IDs', () => {
      expect(chainIdToName(999)).toBe('ETH');
      expect(chainIdToName(0)).toBe('ETH');
      expect(chainIdToName(-1)).toBe('ETH');
    });
  });

  describe('TRENDING_TOKENS_FILTERS', () => {
    it('should have correct default values', () => {
      expect(TRENDING_TOKENS_FILTERS).toEqual({
        rankBy: 'volume',
        orderBy: 'desc',
        minVol24H: 1000,
        isNotHP: true,
        maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      });
    });

    it('should have volume ranking', () => {
      expect(TRENDING_TOKENS_FILTERS.rankBy).toBe('volume');
    });

    it('should have descending order', () => {
      expect(TRENDING_TOKENS_FILTERS.orderBy).toBe('desc');
    });

    it('should have minimum volume of 1000', () => {
      expect(TRENDING_TOKENS_FILTERS.minVol24H).toBe(1000);
    });

    it('should exclude honeypots', () => {
      expect(TRENDING_TOKENS_FILTERS.isNotHP).toBe(true);
    });

    it('should have maximum age of 7 days', () => {
      expect(TRENDING_TOKENS_FILTERS.maxAge).toBe(7 * 24 * 60 * 60);
    });
  });

  describe('NEW_TOKENS_FILTERS', () => {
    it('should have correct default values', () => {
      expect(NEW_TOKENS_FILTERS).toEqual({
        rankBy: 'age',
        orderBy: 'desc',
        maxAge: 24 * 60 * 60, // 24 hours in seconds
        isNotHP: true,
      });
    });

    it('should have age ranking', () => {
      expect(NEW_TOKENS_FILTERS.rankBy).toBe('age');
    });

    it('should have descending order', () => {
      expect(NEW_TOKENS_FILTERS.orderBy).toBe('desc');
    });

    it('should have maximum age of 24 hours', () => {
      expect(NEW_TOKENS_FILTERS.maxAge).toBe(24 * 60 * 60);
    });

    it('should exclude honeypots', () => {
      expect(NEW_TOKENS_FILTERS.isNotHP).toBe(true);
    });
  });
});
