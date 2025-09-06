# Testing

This project uses Vitest for unit testing React components and utility functions.

## Installation

```bash
npm install
```

## Running Tests

### Run all tests
```bash
npm run test:run
```

### Run tests in watch mode
```bash
npm run test
```

### Run tests with UI
```bash
npm run test:ui
```

## Test Structure

### Utility Functions (`src/utils/__tests__/`)
- `tokenUtils.test.ts` - tests for number formatting, price formatting, percentage formatting and data conversion functions

### Custom Hooks (`src/hooks/__tests__/`)
- `usePrevious.test.ts` - tests for hook that tracks previous values
- `useTable.test.tsx` - tests for table management hook
- `useWebSocket.test.tsx` - tests for WebSocket connection hook

### React Components (`src/components/__tests__/`)
- `TableFilters.test.tsx` - tests for table filters component
- `Table.test.tsx` - tests for main table component

### Type Schemas (`src/scheme/__tests__/`)
- `type.test.ts` - tests for type utility functions

### Main Application (`src/__tests__/`)
- `App.test.tsx` - tests for main application component

## Test Coverage

Tests cover:
- ✅ Utility functions (formatting, data conversion)
- ✅ Custom hooks (usePrevious, useTable, useWebSocket)
- ✅ React components (Table, TableFilters)
- ✅ Type schemas and utility functions
- ✅ Main application

## Test Environment Setup

Tests are configured using:
- **Vitest** - fast testing framework
- **@testing-library/react** - utilities for testing React components
- **@testing-library/jest-dom** - additional DOM matchers
- **jsdom** - DOM environment for Node.js

## Mocks

Tests use mocks for:
- UI components (Button, Checkbox, Input, Select)
- WebSocket connections
- API requests
- Environment variables

## Test Examples

### Utility Function Test
```typescript
it('should format numbers in billions', () => {
  expect(formatNumber(1500000000)).toBe('1.5B');
  expect(formatNumber('2000000000')).toBe('2.0B');
});
```

### React Component Test
```typescript
it('should render without crashing', () => {
  render(<TableFilters {...props} />);
  expect(screen.getByText('Filters')).toBeInTheDocument();
});
```

### Custom Hook Test
```typescript
it('should return previous value on subsequent renders', () => {
  const { result, rerender } = renderHook(
    ({ value }) => usePrevious(value),
    { initialProps: { value: 'first' } }
  );
  
  rerender({ value: 'second' });
  expect(result.current).toBe('first');
});
```

## Running Specific Tests

```bash
# Run tests for specific file
npm run test:run src/utils/__tests__/tokenUtils.test.ts

# Run tests with specific pattern
npm run test:run -- --grep "formatNumber"
```
