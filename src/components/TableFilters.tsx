import React, { useCallback, useEffect, useState } from 'react';

import { SupportedChainName, TokenTableFilters } from '../scheme/type';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

interface TableFiltersProps {
  filters: TokenTableFilters;
  onFiltersChange: (filters: TokenTableFilters) => void;
  onClearFilters: () => void;
}

const CHAIN_OPTIONS: { value: SupportedChainName; label: string }[] = [
  { value: 'ETH', label: 'Ethereum' },
  { value: 'SOL', label: 'Solana' },
  { value: 'BASE', label: 'Base' },
  { value: 'BSC', label: 'BSC' },
];

export const TableFilters: React.FC<TableFiltersProps> = ({
  filters,
  onFiltersChange,
  onClearFilters,
}) => {
  const [localFilters, setLocalFilters] = useState<TokenTableFilters>(filters);
  const [debouncedFilters, setDebouncedFilters] =
    useState<TokenTableFilters>(filters);
  const [isDebouncing, setIsDebouncing] = useState(false);

  // Debounce effect for input fields
  useEffect(() => {
    setIsDebouncing(true);
    const timer = setTimeout(() => {
      setDebouncedFilters(localFilters);
      setIsDebouncing(false);
    }, 500); // 500ms debounce delay

    return () => {
      clearTimeout(timer);
      setIsDebouncing(false);
    };
  }, [localFilters]);

  // Apply debounced filters to parent
  useEffect(() => {
    onFiltersChange(debouncedFilters);
  }, [debouncedFilters, onFiltersChange]);

  const handleFilterChange = useCallback(
    (key: keyof TokenTableFilters, value: unknown) => {
      setLocalFilters(prev => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleImmediateFilterChange = useCallback(
    (key: keyof TokenTableFilters, value: unknown) => {
      const newFilters = { ...localFilters, [key]: value };
      setLocalFilters(newFilters);
      setDebouncedFilters(newFilters); // Apply immediately for select and checkbox
    },
    [localFilters]
  );

  const handleClearFilters = useCallback(() => {
    const clearedFilters: TokenTableFilters = {
      chain: null,
      minVolume: null,
      maxAge: null,
      minMcap: null,
      excludeHoneypots: false,
    };
    setLocalFilters(clearedFilters);
    setDebouncedFilters(clearedFilters);
    onClearFilters();
  }, [onClearFilters]);

  const formatNumber = (value: number | null): string => {
    if (value === null) return '';
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  };

  const parseNumber = (value: string): number | null => {
    if (!value) return null;
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
  };

  return (
    <div className="mb-6 bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z"
            />
          </svg>
          Filters
        </h3>
        <Button
          onClick={handleClearFilters}
          variant="ghost"
          size="sm"
          className="text-gray-400 hover:text-white hover:bg-gray-800/50 h-8 px-3"
        >
          Clear All
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        {/* Chain Selection */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
            Chain
          </label>
          <Select
            value={localFilters.chain || undefined}
            onValueChange={value =>
              handleImmediateFilterChange('chain', value || null)
            }
          >
            <SelectTrigger className="h-9 bg-gray-800/50 border-gray-600/50 text-white hover:bg-gray-700/50 focus:border-blue-500/50">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-600">
              {CHAIN_OPTIONS.map(option => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className="text-white hover:bg-gray-700 focus:bg-gray-700"
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Minimum Volume Filter */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
            Min Volume
          </label>
          <Input
            type="text"
            placeholder="1K, 1M"
            value={formatNumber(localFilters.minVolume ?? null)}
            onChange={e => {
              const value = e.target.value;
              if (value === '') {
                handleFilterChange('minVolume', null);
              } else {
                const num = parseNumber(value);
                if (num !== null) {
                  handleFilterChange('minVolume', num);
                }
              }
            }}
            className="h-9 bg-gray-800/50 border-gray-600/50 text-white placeholder-gray-500 hover:bg-gray-700/50 focus:border-blue-500/50 text-sm"
          />
        </div>

        {/* Maximum Age Filter */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
            Max Age (h)
          </label>
          <Input
            type="number"
            placeholder="24, 168"
            value={localFilters.maxAge ? localFilters.maxAge / 3600 : ''}
            onChange={e => {
              const value = e.target.value;
              if (value === '') {
                handleFilterChange('maxAge', null);
              } else {
                const hours = parseFloat(value);
                if (!isNaN(hours)) {
                  handleFilterChange('maxAge', hours * 3600);
                }
              }
            }}
            className="h-9 bg-gray-800/50 border-gray-600/50 text-white placeholder-gray-500 hover:bg-gray-700/50 focus:border-blue-500/50 text-sm"
          />
        </div>

        {/* Minimum Market Cap Filter */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
            Min Market Cap
          </label>
          <Input
            type="text"
            placeholder="100K, 1M"
            value={formatNumber(localFilters.minMcap ?? null)}
            onChange={e => {
              const value = e.target.value;
              if (value === '') {
                handleFilterChange('minMcap', null);
              } else {
                const num = parseNumber(value);
                if (num !== null) {
                  handleFilterChange('minMcap', num);
                }
              }
            }}
            className="h-9 bg-gray-800/50 border-gray-600/50 text-white placeholder-gray-500 hover:bg-gray-700/50 focus:border-blue-500/50 text-sm"
          />
        </div>

        {/* Exclude Honeypots Checkbox */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
            Security
          </label>
          <div className="flex items-center h-9">
            <Checkbox
              id="exclude-honeypots"
              checked={localFilters.excludeHoneypots || false}
              onCheckedChange={checked =>
                handleImmediateFilterChange('excludeHoneypots', checked)
              }
              className="border-gray-600/50 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 hover:border-gray-500/50"
            />
            <label
              htmlFor="exclude-honeypots"
              className="ml-2 text-sm text-gray-300 cursor-pointer"
            >
              No Honeypots
            </label>
          </div>
        </div>

        {/* Active Filters Count */}
        <div className="flex flex-col items-center space-y-1">
          <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
            Active
          </label>
          <div className="h-9 flex items-center justify-center">
            <span
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border transition-colors ${
                isDebouncing
                  ? 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30'
                  : 'bg-blue-600/20 text-blue-400 border-blue-600/30'
              }`}
            >
              {isDebouncing && (
                <svg
                  className="w-3 h-3 mr-1 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              )}
              {
                Object.values(localFilters).filter(
                  value => value !== null && value !== false
                ).length
              }{' '}
              filters
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
