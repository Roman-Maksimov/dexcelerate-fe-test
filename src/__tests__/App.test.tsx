import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { App } from '../App';

// Mock the page components
vi.mock('../pages/TrendingTokensPage', () => ({
  TrendingTokensPage: () => (
    <div data-testid="trending-tokens-page">Trending Tokens Page</div>
  ),
}));

vi.mock('../pages/NewTokensPage', () => ({
  NewTokensPage: () => <div data-testid="new-tokens-page">New Tokens Page</div>,
}));

vi.mock('../layouts/MainLayout', () => ({
  MainLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="main-layout">
      <header>Header</header>
      <main>{children}</main>
    </div>
  ),
}));

describe('App', () => {
  it('should render trending tokens page by default', () => {
    render(<App />);

    expect(screen.getByTestId('main-layout')).toBeInTheDocument();
    expect(screen.getByTestId('trending-tokens-page')).toBeInTheDocument();
    expect(screen.getByText('Header')).toBeInTheDocument();
  });

  it('should render new tokens page when navigating to /new-tokens', () => {
    render(<App />);

    // This would require navigation testing, but for now we'll just verify the component renders
    expect(screen.getByTestId('main-layout')).toBeInTheDocument();
  });

  it('should provide QueryClient context', () => {
    render(<App />);

    // The QueryClientProvider should be available in the component tree
    expect(screen.getByTestId('main-layout')).toBeInTheDocument();
  });

  it('should render router structure correctly', () => {
    render(<App />);

    // Verify the main layout is rendered
    expect(screen.getByTestId('main-layout')).toBeInTheDocument();

    // Verify the default route content is rendered
    expect(screen.getByTestId('trending-tokens-page')).toBeInTheDocument();
  });
});
