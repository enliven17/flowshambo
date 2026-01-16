/**
 * Tests for ErrorDisplay Component
 * 
 * @module components/ErrorDisplay.test
 * 
 * **Validates: Requirements 1.4, 2.8, 6.7**
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ErrorDisplay } from './ErrorDisplay';
import type { FlowShamboError } from '../lib/errors';

describe('ErrorDisplay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const createMockError = (overrides: Partial<FlowShamboError> = {}): FlowShamboError => ({
    code: 'TEST_ERROR',
    category: 'unknown',
    severity: 'error',
    message: 'Test error message',
    recoverable: true,
    retryable: true,
    timestamp: Date.now(),
    ...overrides,
  });

  describe('Rendering', () => {
    it('should render error message', () => {
      const error = createMockError({ message: 'Something went wrong' });
      render(<ErrorDisplay error={error} />);
      
      expect(screen.getByText('Something went wrong')).toBeDefined();
    });

    it('should render string errors', () => {
      render(<ErrorDisplay error="Simple error string" />);
      
      expect(screen.getByText('Simple error string')).toBeDefined();
    });

    it('should not render when error is null', () => {
      render(<ErrorDisplay error={null} />);
      
      expect(screen.queryByTestId('error-display')).toBeNull();
    });

    it('should render suggested action when provided', () => {
      const error = createMockError({
        suggestedAction: 'Please try again later',
      });
      render(<ErrorDisplay error={error} />);
      
      expect(screen.getByText('Please try again later')).toBeDefined();
    });

    it('should render with correct severity styling', () => {
      const error = createMockError({ severity: 'warning' });
      render(<ErrorDisplay error={error} />);
      
      const display = screen.getByTestId('error-display');
      expect(display.getAttribute('data-severity')).toBe('warning');
    });
  });

  describe('Severity Levels', () => {
    it('should display "Notice" for info severity', () => {
      const error = createMockError({ severity: 'info' });
      render(<ErrorDisplay error={error} />);
      
      expect(screen.getByText('Notice')).toBeDefined();
    });

    it('should display "Warning" for warning severity', () => {
      const error = createMockError({ severity: 'warning' });
      render(<ErrorDisplay error={error} />);
      
      expect(screen.getByText('Warning')).toBeDefined();
    });

    it('should display "Error" for error severity', () => {
      const error = createMockError({ severity: 'error' });
      render(<ErrorDisplay error={error} />);
      
      expect(screen.getByText('Error')).toBeDefined();
    });

    it('should display "Critical Error" for critical severity', () => {
      const error = createMockError({ severity: 'critical' });
      render(<ErrorDisplay error={error} />);
      
      expect(screen.getByText('Critical Error')).toBeDefined();
    });
  });

  describe('Dismiss Functionality', () => {
    it('should call onDismiss when dismiss button is clicked', () => {
      const onDismiss = vi.fn();
      const error = createMockError();
      render(<ErrorDisplay error={error} onDismiss={onDismiss} />);
      
      const dismissButton = screen.getByLabelText('Dismiss error');
      fireEvent.click(dismissButton);
      
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('should not show dismiss button when onDismiss is not provided', () => {
      const error = createMockError();
      render(<ErrorDisplay error={error} />);
      
      expect(screen.queryByLabelText('Dismiss error')).toBeNull();
    });

    it('should auto-dismiss after specified time', async () => {
      vi.useRealTimers(); // Use real timers for this test
      const onDismiss = vi.fn();
      const error = createMockError();
      render(<ErrorDisplay error={error} onDismiss={onDismiss} autoDismissMs={100} />);
      
      expect(screen.getByTestId('error-display')).toBeDefined();
      
      await waitFor(() => {
        expect(onDismiss).toHaveBeenCalledTimes(1);
      }, { timeout: 500 });
    });

    it('should not auto-dismiss when autoDismissMs is 0', () => {
      const onDismiss = vi.fn();
      const error = createMockError();
      render(<ErrorDisplay error={error} onDismiss={onDismiss} autoDismissMs={0} />);
      
      act(() => {
        vi.advanceTimersByTime(10000);
      });
      
      expect(onDismiss).not.toHaveBeenCalled();
      expect(screen.getByTestId('error-display')).toBeDefined();
    });
  });

  describe('Retry Functionality', () => {
    it('should show retry button when showRetry is true and error is retryable', () => {
      const onRetry = vi.fn();
      const error = createMockError({ retryable: true });
      render(<ErrorDisplay error={error} onRetry={onRetry} showRetry />);
      
      expect(screen.getByLabelText('Retry operation')).toBeDefined();
    });

    it('should not show retry button when error is not retryable', () => {
      const onRetry = vi.fn();
      const error = createMockError({ retryable: false });
      render(<ErrorDisplay error={error} onRetry={onRetry} showRetry />);
      
      expect(screen.queryByLabelText('Retry operation')).toBeNull();
    });

    it('should call onRetry when retry button is clicked', () => {
      const onRetry = vi.fn();
      const error = createMockError({ retryable: true });
      render(<ErrorDisplay error={error} onRetry={onRetry} showRetry />);
      
      const retryButton = screen.getByLabelText('Retry operation');
      fireEvent.click(retryButton);
      
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('should show loading state when isRetrying is true', () => {
      const onRetry = vi.fn();
      const error = createMockError({ retryable: true });
      render(<ErrorDisplay error={error} onRetry={onRetry} showRetry isRetrying />);
      
      expect(screen.getByText('Retrying...')).toBeDefined();
    });

    it('should disable retry button when isRetrying is true', () => {
      const onRetry = vi.fn();
      const error = createMockError({ retryable: true });
      render(<ErrorDisplay error={error} onRetry={onRetry} showRetry isRetrying />);
      
      const retryButton = screen.getByLabelText('Retry operation');
      expect(retryButton).toHaveProperty('disabled', true);
    });

    it('should show retry progress when provided', () => {
      const onRetry = vi.fn();
      const error = createMockError({ retryable: true });
      render(
        <ErrorDisplay
          error={error}
          onRetry={onRetry}
          showRetry
          isRetrying
          retryAttempt={2}
          maxRetryAttempts={3}
        />
      );
      
      expect(screen.getByText('Retry attempt 2 of 3...')).toBeDefined();
    });
  });

  describe('Compact Mode', () => {
    it('should render in compact mode', () => {
      const error = createMockError();
      render(<ErrorDisplay error={error} compact />);
      
      const display = screen.getByTestId('error-display');
      expect(display.className).toContain('error-display--compact');
    });

    it('should show retry button in compact mode', () => {
      const onRetry = vi.fn();
      const error = createMockError({ retryable: true });
      render(<ErrorDisplay error={error} onRetry={onRetry} showRetry compact />);
      
      expect(screen.getByLabelText('Retry')).toBeDefined();
    });

    it('should show dismiss button in compact mode', () => {
      const onDismiss = vi.fn();
      const error = createMockError();
      render(<ErrorDisplay error={error} onDismiss={onDismiss} compact />);
      
      expect(screen.getByLabelText('Dismiss error')).toBeDefined();
    });
  });

  describe('Accessibility', () => {
    it('should have role="alert"', () => {
      const error = createMockError();
      render(<ErrorDisplay error={error} />);
      
      expect(screen.getByRole('alert')).toBeDefined();
    });

    it('should have proper aria labels on buttons', () => {
      const onDismiss = vi.fn();
      const onRetry = vi.fn();
      const error = createMockError({ retryable: true });
      render(
        <ErrorDisplay
          error={error}
          onDismiss={onDismiss}
          onRetry={onRetry}
          showRetry
        />
      );
      
      expect(screen.getByLabelText('Retry operation')).toBeDefined();
      expect(screen.getByLabelText('Dismiss error')).toBeDefined();
      expect(screen.getByLabelText('Close')).toBeDefined();
    });
  });

  describe('Error Updates', () => {
    it('should update when error changes', () => {
      const error1 = createMockError({ message: 'First error' });
      const error2 = createMockError({ message: 'Second error', timestamp: Date.now() + 1000 });
      
      const { rerender } = render(<ErrorDisplay error={error1} />);
      expect(screen.getByText('First error')).toBeDefined();
      
      rerender(<ErrorDisplay error={error2} />);
      expect(screen.getByText('Second error')).toBeDefined();
    });

    it('should become visible again when new error arrives after dismiss', () => {
      const onDismiss = vi.fn();
      const error1 = createMockError({ message: 'First error', timestamp: 1000 });
      const error2 = createMockError({ message: 'Second error', timestamp: 2000 });
      
      const { rerender } = render(<ErrorDisplay error={error1} onDismiss={onDismiss} />);
      
      // Dismiss the first error
      fireEvent.click(screen.getByLabelText('Dismiss error'));
      expect(screen.queryByTestId('error-display')).toBeNull();
      
      // New error should appear
      rerender(<ErrorDisplay error={error2} onDismiss={onDismiss} />);
      expect(screen.getByText('Second error')).toBeDefined();
    });
  });
});
