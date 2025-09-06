import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import * as SelectPrimitive from '@radix-ui/react-select';
import { render, screen } from '@testing-library/react';
import * as React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TokenTableFilters } from '../../scheme/type';
import { TableFilters } from '../TableFilters';

// Mock the UI components
vi.mock('../../ui/button', () => ({
  Button: ({ children, onClick, ...props }: React.ComponentProps<'button'>) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('../../ui/checkbox', () => ({
  Checkbox: ({
    onCheckedChange,
    ...props
  }: React.ComponentProps<typeof CheckboxPrimitive.Root>) => (
    <input
      type="checkbox"
      // @ts-expect-error mock
      onChange={e => onCheckedChange?.(e.target.checked)}
      {...props}
    />
  ),
}));

vi.mock('../../ui/input', () => ({
  Input: ({ value, onChange, ...props }: React.ComponentProps<'input'>) => (
    <input value={value} onChange={onChange} {...props} />
  ),
}));

vi.mock('../../ui/select', () => ({
  Select: ({
    children,
    value,
    onValueChange,
  }: React.ComponentProps<typeof SelectPrimitive.Root>) => (
    <select value={value} onChange={e => onValueChange?.(e.target.value)}>
      {children}
    </select>
  ),
  SelectContent: ({
    children,
  }: React.ComponentProps<typeof SelectPrimitive.Content>) => (
    <div>{children}</div>
  ),
  SelectItem: ({
    children,
    value,
  }: React.ComponentProps<typeof SelectPrimitive.Item>) => (
    <option value={value}>{children}</option>
  ),
  SelectTrigger: ({
    children,
  }: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
    size?: 'sm' | 'default';
  }) => <div>{children}</div>,
  SelectValue: ({
    placeholder,
  }: React.ComponentProps<typeof SelectPrimitive.Value>) => (
    <span>{placeholder}</span>
  ),
}));

describe('TableFilters - Simple Tests', () => {
  const mockOnFiltersChange = vi.fn();
  const mockOnClearFilters = vi.fn();

  const defaultFilters: TokenTableFilters = {
    chain: null,
    minVolume: null,
    maxAge: null,
    minMcap: null,
    excludeHoneypots: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    render(
      <TableFilters
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        onClearFilters={mockOnClearFilters}
      />
    );

    expect(screen.getByText('Filters')).toBeInTheDocument();
  });

  it('should render all filter sections', () => {
    render(
      <TableFilters
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        onClearFilters={mockOnClearFilters}
      />
    );

    expect(screen.getByText('Chain')).toBeInTheDocument();
    expect(screen.getByText(/Min Volume/)).toBeInTheDocument();
    expect(screen.getByText(/Max Age/)).toBeInTheDocument();
    expect(screen.getByText(/Min Market Cap/)).toBeInTheDocument();
    expect(screen.getByText('Security')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('should render clear button', () => {
    render(
      <TableFilters
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        onClearFilters={mockOnClearFilters}
      />
    );

    expect(screen.getByText('Clear All')).toBeInTheDocument();
  });

  it('should render input fields', () => {
    render(
      <TableFilters
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        onClearFilters={mockOnClearFilters}
      />
    );

    expect(screen.getByPlaceholderText('1000')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('3600, 86400')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('100000')).toBeInTheDocument();
  });

  it('should render checkbox', () => {
    render(
      <TableFilters
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        onClearFilters={mockOnClearFilters}
      />
    );

    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });

  it('should render select dropdown', () => {
    render(
      <TableFilters
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        onClearFilters={mockOnClearFilters}
      />
    );

    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });
});
