import Decimal from 'decimal.js';
import { describe, expect, it } from 'vitest';

import { ScannerResult } from '../../scheme/type';
import {
  calculateMarketCap,
  convertToTokenData,
  formatAge,
  formatNumber,
  formatPercentage,
  formatPrice,
} from '../tokenUtils';

describe('tokenUtils', () => {
  describe('calculateMarketCap', () => {
    it('should return currentMcap when it is greater than 0', () => {
      const result: ScannerResult = {
        currentMcap: '1000000',
        initialMcap: '500000',
        pairMcapUsd: '300000',
        pairMcapUsdInitial: '200000',
      } as ScannerResult;

      expect(calculateMarketCap(result)).toBe(1000000);
    });

    it('should return initialMcap when currentMcap is 0', () => {
      const result: ScannerResult = {
        currentMcap: '0',
        initialMcap: '500000',
        pairMcapUsd: '300000',
        pairMcapUsdInitial: '200000',
      } as ScannerResult;

      expect(calculateMarketCap(result)).toBe(500000);
    });

    it('should return pairMcapUsd when currentMcap and initialMcap are 0', () => {
      const result: ScannerResult = {
        currentMcap: '0',
        initialMcap: '0',
        pairMcapUsd: '300000',
        pairMcapUsdInitial: '200000',
      } as ScannerResult;

      expect(calculateMarketCap(result)).toBe(300000);
    });

    it('should return pairMcapUsdInitial when all others are 0', () => {
      const result: ScannerResult = {
        currentMcap: '0',
        initialMcap: '0',
        pairMcapUsd: '0',
        pairMcapUsdInitial: '200000',
      } as ScannerResult;

      expect(calculateMarketCap(result)).toBe(200000);
    });

    it('should return 0 when all values are 0', () => {
      const result: ScannerResult = {
        currentMcap: '0',
        initialMcap: '0',
        pairMcapUsd: '0',
        pairMcapUsdInitial: '0',
      } as ScannerResult;

      expect(calculateMarketCap(result)).toBe(0);
    });
  });

  describe('formatNumber', () => {
    it('should format numbers in billions', () => {
      expect(formatNumber(1500000000)).toBe('1.5B');
      expect(formatNumber('2000000000')).toBe('2.0B');
      expect(formatNumber(new Decimal('3000000000'))).toBe('3.0B');
    });

    it('should format numbers in millions', () => {
      expect(formatNumber(1500000)).toBe('1.5M');
      expect(formatNumber('2000000')).toBe('2.0M');
      expect(formatNumber(new Decimal('3000000'))).toBe('3.0M');
    });

    it('should format numbers in thousands', () => {
      expect(formatNumber(1500)).toBe('1.5K');
      expect(formatNumber('2000')).toBe('2.0K');
      expect(formatNumber(new Decimal('3000'))).toBe('3.0K');
    });

    it('should format small numbers without suffix', () => {
      expect(formatNumber(150)).toBe('150');
      expect(formatNumber('200')).toBe('200');
      expect(formatNumber(new Decimal('300'))).toBe('300');
    });

    it('should handle decimal numbers', () => {
      expect(formatNumber(1.5)).toBe('1.5');
      expect(formatNumber(0.5)).toBe('0.5');
    });
  });

  describe('formatPrice', () => {
    it('should format regular prices', () => {
      expect(formatPrice(1.5)).toBe('1.5');
      expect(formatPrice('2.5')).toBe('2.5');
      expect(formatPrice(new Decimal('3.5'))).toBe('3.5');
    });

    it('should format very small prices with subscript notation', () => {
      expect(formatPrice(0.000321)).toBe('0.0₃321');
      expect(formatPrice(0.0000321)).toBe('0.0₄321');
      expect(formatPrice(0.00000321)).toBe('0.0₅321');
    });

    it('should not use subscript for 2 or fewer leading zeros', () => {
      expect(formatPrice(0.01)).toBe('0.01');
      expect(formatPrice(0.001)).toBe('0.001');
    });

    it('should handle zero and negative numbers', () => {
      expect(formatPrice(0)).toBe('0');
      expect(formatPrice(-1.5)).toBe('-2');
    });
  });

  describe('formatPercentage', () => {
    it('should format positive percentages', () => {
      const result = formatPercentage(5.25);
      expect(result.text).toBe('+5.25%');
      expect(result.isPositive).toBe(true);
    });

    it('should format negative percentages', () => {
      const result = formatPercentage(-3.75);
      expect(result.text).toBe('-3.75%');
      expect(result.isPositive).toBe(false);
    });

    it('should handle zero percentage', () => {
      const result = formatPercentage(0);
      expect(result.text).toBe('-');
      expect(result.isPositive).toBe(false);
    });

    it('should handle NaN and Infinity', () => {
      const nanResult = formatPercentage(NaN);
      expect(nanResult.text).toBe('-');
      expect(nanResult.isPositive).toBe(false);

      const infResult = formatPercentage(Infinity);
      expect(infResult.text).toBe('-');
      expect(infResult.isPositive).toBe(false);
    });
  });

  describe('formatAge', () => {
    it('should format age in days', () => {
      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
      expect(formatAge(twoDaysAgo)).toBe('2d');
    });

    it('should format age in hours', () => {
      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      expect(formatAge(twoHoursAgo)).toBe('2h');
    });

    it('should format age in minutes', () => {
      const now = new Date();
      const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
      expect(formatAge(thirtyMinutesAgo)).toBe('30m');
    });

    it('should handle very recent timestamps', () => {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      expect(formatAge(fiveMinutesAgo)).toBe('5m');
    });
  });

  describe('convertToTokenData', () => {
    it('should convert ScannerResult to TokenData correctly', () => {
      const scannerResult: ScannerResult = {
        pairAddress: '0x123',
        token0Symbol: 'ETH',
        token1Name: 'Test Token',
        token1Symbol: 'TEST',
        token1Address: '0x456',
        token1TotalSupplyFormatted: '1000000',
        chainId: 1,
        price: '0.001',
        volume: '10000',
        currentMcap: '1000000',
        initialMcap: '500000',
        pairMcapUsd: '0',
        pairMcapUsdInitial: '0',
        diff5M: '5.5',
        diff1H: '10.2',
        diff6H: '-2.1',
        diff24H: '15.8',
        buys: 100,
        sells: 50,
        isMintAuthDisabled: true,
        isFreezeAuthDisabled: false,
        honeyPot: false,
        contractVerified: true,
        age: '2024-01-01T00:00:00Z',
        liquidity: '50000',
        percentChangeInLiquidity: '2.5',
        migrationProgress: '75.5',
        discordLink: 'https://discord.gg/test',
        telegramLink: 'https://t.me/test',
        twitterLink: 'https://twitter.com/test',
        webLink: 'https://test.com',
        dexPaid: true,
        virtualRouterType: 'UniswapV2',
        routerAddress: '0x789',
      } as ScannerResult;

      const tokenData = convertToTokenData(scannerResult);

      expect(tokenData.id).toBe('0x123');
      expect(tokenData.tokenBase).toBe('ETH');
      expect(tokenData.tokenName).toBe('Test Token');
      expect(tokenData.tokenSymbol).toBe('TEST');
      expect(tokenData.tokenAddress).toBe('0x456');
      expect(tokenData.pairAddress).toBe('0x123');
      expect(tokenData.chain).toBe('ETH');
      expect(tokenData.exchange).toBe('UniswapV2');
      expect(tokenData.priceUsd).toEqual(new Decimal('0.001'));
      expect(tokenData.volumeUsd).toEqual(new Decimal('10000'));
      expect(tokenData.mcap).toBe(1000000);
      expect(tokenData.totalSupply).toBe(1000000);
      expect(tokenData.priceChangePcs).toEqual({
        '5m': 5.5,
        '1h': 10.2,
        '6h': -2.1,
        '24h': 15.8,
      });
      expect(tokenData.transactions).toEqual({
        buys: 100,
        sells: 50,
      });
      expect(tokenData.audit).toEqual({
        mintable: true,
        freezable: false,
        honeypot: false,
        contractVerified: true,
      });
      expect(tokenData.liquidity).toEqual({
        current: 50000,
        changePc: 2.5,
      });
      expect(tokenData.migrationPc).toBe(75.5);
      expect(tokenData.socialLinks).toEqual({
        discord: 'https://discord.gg/test',
        telegram: 'https://t.me/test',
        twitter: 'https://twitter.com/test',
        website: 'https://test.com',
      });
      expect(tokenData.dexPaid).toBe(true);
    });
  });
});
