/**
 * Test Utilities
 * 
 * Common utilities and helpers for testing React components
 * and game logic in FlowShambo.
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';

/**
 * Custom render function that wraps components with necessary providers
 * Use this instead of @testing-library/react's render for component tests
 */
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  // Add any provider-specific options here
}

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  // Add providers here as needed (e.g., FlowProvider mock, state providers)
  return <>{children}</>;
};

export const customRender = (
  ui: ReactElement,
  options?: CustomRenderOptions
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything from @testing-library/react
export * from '@testing-library/react';

// Override render with custom render
export { customRender as render };
