/**
 * BettingPanel Component Tests
 * 
 * Tests for the BettingPanel component covering:
 * - Prediction selector (Rock/Paper/Scissors buttons)
 * - Amount input with validation
 * - Place bet button with disabled states
 * - Potential payout display
 * - Flow green styling
 * 
 * Requirements: 2.1, 2.2, 2.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BettingPanel } from './BettingPanel';

describe('BettingPanel', () => {
  const defaultProps = {
    onPlaceBet: vi.fn(),
    balance: 10,
    minBet: 0.1,
    maxBet: 100,
    disabled: false,
    isLoading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the betting panel with all elements', () => {
      render(<BettingPanel {...defaultProps} />);

      // Header
      expect(screen.getByText('Place Your Bet')).toBeDefined();

      // Prediction buttons
      expect(screen.getByRole('button', { name: /select rock/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /select paper/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /select scissors/i })).toBeDefined();

      // Amount input
      expect(screen.getByLabelText(/bet amount/i)).toBeDefined();

      // Place bet button
      expect(screen.getByRole('button', { name: /place bet/i })).toBeDefined();
    });

    it('displays min/max/balance info', () => {
      render(<BettingPanel {...defaultProps} />);

      expect(screen.getByText(/min: 0.1 flow/i)).toBeDefined();
      expect(screen.getByText(/max: 100 flow/i)).toBeDefined();
      expect(screen.getByText(/balance: 10.0000 flow/i)).toBeDefined();
    });

    it('renders emojis for each prediction type', () => {
      render(<BettingPanel {...defaultProps} />);

      expect(screen.getByText('🪨')).toBeDefined();
      expect(screen.getByText('📄')).toBeDefined();
      expect(screen.getByText('✂️')).toBeDefined();
    });
  });

  describe('Prediction Selection', () => {
    it('allows selecting Rock prediction', () => {
      render(<BettingPanel {...defaultProps} />);

      const rockButton = screen.getByRole('button', { name: /select rock/i });
      fireEvent.click(rockButton);

      expect(rockButton.getAttribute('data-selected')).toBe('true');
      expect(rockButton.getAttribute('aria-pressed')).toBe('true');
    });

    it('allows selecting Paper prediction', () => {
      render(<BettingPanel {...defaultProps} />);

      const paperButton = screen.getByRole('button', { name: /select paper/i });
      fireEvent.click(paperButton);

      expect(paperButton.getAttribute('data-selected')).toBe('true');
    });

    it('allows selecting Scissors prediction', () => {
      render(<BettingPanel {...defaultProps} />);

      const scissorsButton = screen.getByRole('button', { name: /select scissors/i });
      fireEvent.click(scissorsButton);

      expect(scissorsButton.getAttribute('data-selected')).toBe('true');
    });

    it('only allows one prediction to be selected at a time', () => {
      render(<BettingPanel {...defaultProps} />);

      const rockButton = screen.getByRole('button', { name: /select rock/i });
      const paperButton = screen.getByRole('button', { name: /select paper/i });

      fireEvent.click(rockButton);
      expect(rockButton.getAttribute('data-selected')).toBe('true');
      expect(paperButton.getAttribute('data-selected')).toBe('false');

      fireEvent.click(paperButton);
      expect(rockButton.getAttribute('data-selected')).toBe('false');
      expect(paperButton.getAttribute('data-selected')).toBe('true');
    });

    it('disables prediction buttons when disabled prop is true', () => {
      render(<BettingPanel {...defaultProps} disabled={true} />);

      expect(screen.getByRole('button', { name: /select rock/i })).toHaveProperty('disabled', true);
      expect(screen.getByRole('button', { name: /select paper/i })).toHaveProperty('disabled', true);
      expect(screen.getByRole('button', { name: /select scissors/i })).toHaveProperty('disabled', true);
    });

    it('disables prediction buttons when loading', () => {
      render(<BettingPanel {...defaultProps} isLoading={true} />);

      expect(screen.getByRole('button', { name: /select rock/i })).toHaveProperty('disabled', true);
      expect(screen.getByRole('button', { name: /select paper/i })).toHaveProperty('disabled', true);
      expect(screen.getByRole('button', { name: /select scissors/i })).toHaveProperty('disabled', true);
    });
  });

  describe('Amount Input', () => {
    it('allows entering a valid bet amount', () => {
      render(<BettingPanel {...defaultProps} />);

      const input = screen.getByLabelText(/bet amount/i) as HTMLInputElement;
      fireEvent.change(input, { target: { value: '5' } });

      expect(input.value).toBe('5');
    });

    it('allows entering decimal amounts', () => {
      render(<BettingPanel {...defaultProps} />);

      const input = screen.getByLabelText(/bet amount/i) as HTMLInputElement;
      fireEvent.change(input, { target: { value: '5.5' } });

      expect(input.value).toBe('5.5');
    });

    it('prevents entering non-numeric characters', () => {
      render(<BettingPanel {...defaultProps} />);

      const input = screen.getByLabelText(/bet amount/i) as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'abc' } });

      expect(input.value).toBe('');
    });

    it('disables input when disabled prop is true', () => {
      render(<BettingPanel {...defaultProps} disabled={true} />);

      expect(screen.getByLabelText(/bet amount/i)).toHaveProperty('disabled', true);
    });

    it('disables input when loading', () => {
      render(<BettingPanel {...defaultProps} isLoading={true} />);

      expect(screen.getByLabelText(/bet amount/i)).toHaveProperty('disabled', true);
    });
  });

  describe('Amount Validation', () => {
    it('shows error for amount exceeding balance', () => {
      render(<BettingPanel {...defaultProps} balance={5} />);

      const input = screen.getByLabelText(/bet amount/i);
      fireEvent.change(input, { target: { value: '10' } });
      fireEvent.blur(input);

      expect(screen.getByRole('alert').textContent).toContain('Insufficient funds');
    });

    it('shows error for amount below minimum', () => {
      render(<BettingPanel {...defaultProps} minBet={1} />);

      const input = screen.getByLabelText(/bet amount/i);
      fireEvent.change(input, { target: { value: '0.5' } });
      fireEvent.blur(input);

      expect(screen.getByRole('alert').textContent).toContain('at least 1 FLOW');
    });

    it('shows error for amount above maximum', () => {
      render(<BettingPanel {...defaultProps} maxBet={10} balance={100} />);

      const input = screen.getByLabelText(/bet amount/i);
      fireEvent.change(input, { target: { value: '50' } });
      fireEvent.blur(input);

      expect(screen.getByRole('alert').textContent).toContain('cannot exceed 10 FLOW');
    });

    it('shows error for zero amount', () => {
      render(<BettingPanel {...defaultProps} />);

      const input = screen.getByLabelText(/bet amount/i);
      fireEvent.change(input, { target: { value: '0' } });
      fireEvent.blur(input);

      expect(screen.getByRole('alert').textContent).toContain('greater than zero');
    });

    it('does not show error before input is touched', () => {
      render(<BettingPanel {...defaultProps} />);

      expect(screen.queryByRole('alert')).toBeNull();
    });
  });

  describe('MAX Button', () => {
    it('sets amount to balance when balance is less than maxBet', () => {
      render(<BettingPanel {...defaultProps} balance={5} maxBet={100} />);

      const maxButton = screen.getByRole('button', { name: /max/i });
      fireEvent.click(maxButton);

      const input = screen.getByLabelText(/bet amount/i) as HTMLInputElement;
      expect(input.value).toBe('5');
    });

    it('sets amount to maxBet when balance exceeds maxBet', () => {
      render(<BettingPanel {...defaultProps} balance={200} maxBet={100} />);

      const maxButton = screen.getByRole('button', { name: /max/i });
      fireEvent.click(maxButton);

      const input = screen.getByLabelText(/bet amount/i) as HTMLInputElement;
      expect(input.value).toBe('100');
    });

    it('is disabled when panel is disabled', () => {
      render(<BettingPanel {...defaultProps} disabled={true} />);

      expect(screen.getByRole('button', { name: /max/i })).toHaveProperty('disabled', true);
    });
  });

  describe('Potential Payout', () => {
    it('shows potential payout when valid amount is entered', () => {
      render(<BettingPanel {...defaultProps} />);

      const input = screen.getByLabelText(/bet amount/i);
      fireEvent.change(input, { target: { value: '4' } });

      // 4 * 2.5 = 10
      expect(screen.getByText('10.0000 FLOW')).toBeDefined();
      expect(screen.getByText(/2.5x/)).toBeDefined();
    });

    it('does not show payout for invalid amount', () => {
      render(<BettingPanel {...defaultProps} balance={5} />);

      const input = screen.getByLabelText(/bet amount/i);
      fireEvent.change(input, { target: { value: '10' } }); // Exceeds balance
      fireEvent.blur(input);

      expect(screen.queryByText(/potential payout/i)).toBeNull();
    });

    it('does not show payout for zero amount', () => {
      render(<BettingPanel {...defaultProps} />);

      expect(screen.queryByText(/potential payout/i)).toBeNull();
    });
  });

  describe('Place Bet Button', () => {
    it('is disabled when no prediction is selected', () => {
      render(<BettingPanel {...defaultProps} />);

      const input = screen.getByLabelText(/bet amount/i);
      fireEvent.change(input, { target: { value: '5' } });

      expect(screen.getByRole('button', { name: /place bet/i })).toHaveProperty('disabled', true);
    });

    it('is disabled when no amount is entered', () => {
      render(<BettingPanel {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /select rock/i }));

      expect(screen.getByRole('button', { name: /place bet/i })).toHaveProperty('disabled', true);
    });

    it('is disabled when amount is invalid', () => {
      render(<BettingPanel {...defaultProps} balance={5} />);

      fireEvent.click(screen.getByRole('button', { name: /select rock/i }));
      const input = screen.getByLabelText(/bet amount/i);
      fireEvent.change(input, { target: { value: '10' } }); // Exceeds balance

      expect(screen.getByRole('button', { name: /place bet/i })).toHaveProperty('disabled', true);
    });

    it('is disabled when panel is disabled', () => {
      render(<BettingPanel {...defaultProps} disabled={true} />);

      expect(screen.getByRole('button', { name: /place bet/i })).toHaveProperty('disabled', true);
    });

    it('is enabled when prediction and valid amount are provided', () => {
      render(<BettingPanel {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /select rock/i }));
      const input = screen.getByLabelText(/bet amount/i);
      fireEvent.change(input, { target: { value: '5' } });

      expect(screen.getByRole('button', { name: /place bet/i })).toHaveProperty('disabled', false);
    });

    it('calls onPlaceBet with correct arguments when clicked', () => {
      const onPlaceBet = vi.fn();
      render(<BettingPanel {...defaultProps} onPlaceBet={onPlaceBet} />);

      fireEvent.click(screen.getByRole('button', { name: /select paper/i }));
      const input = screen.getByLabelText(/bet amount/i);
      fireEvent.change(input, { target: { value: '5' } });
      fireEvent.click(screen.getByRole('button', { name: /place bet/i }));

      expect(onPlaceBet).toHaveBeenCalledTimes(1);
      expect(onPlaceBet).toHaveBeenCalledWith('paper', 5);
    });

    it('shows loading state when isLoading is true', () => {
      render(<BettingPanel {...defaultProps} isLoading={true} />);

      expect(screen.getByText('Placing Bet...')).toBeDefined();
    });
  });

  describe('Disabled State', () => {
    it('shows connect wallet message when disabled', () => {
      render(<BettingPanel {...defaultProps} disabled={true} />);

      expect(screen.getByText(/connect your wallet to place a bet/i)).toBeDefined();
    });

    it('does not show connect wallet message when enabled', () => {
      render(<BettingPanel {...defaultProps} disabled={false} />);

      expect(screen.queryByText(/connect your wallet to place a bet/i)).toBeNull();
    });
  });

  describe('Accessibility', () => {
    it('has proper aria labels for prediction buttons', () => {
      render(<BettingPanel {...defaultProps} />);

      expect(screen.getByRole('button', { name: /select rock/i }).getAttribute('aria-pressed')).toBe('false');
      expect(screen.getByRole('button', { name: /select paper/i }).getAttribute('aria-pressed')).toBe('false');
      expect(screen.getByRole('button', { name: /select scissors/i }).getAttribute('aria-pressed')).toBe('false');
    });

    it('marks input as invalid when validation fails', () => {
      render(<BettingPanel {...defaultProps} balance={5} />);

      const input = screen.getByLabelText(/bet amount/i);
      fireEvent.change(input, { target: { value: '10' } });
      fireEvent.blur(input);

      expect(input.getAttribute('aria-invalid')).toBe('true');
    });

    it('associates error message with input via aria-describedby', () => {
      render(<BettingPanel {...defaultProps} balance={5} />);

      const input = screen.getByLabelText(/bet amount/i);
      fireEvent.change(input, { target: { value: '10' } });
      fireEvent.blur(input);

      expect(input.getAttribute('aria-describedby')).toBe('bet-error');
      expect(screen.getByRole('alert').getAttribute('id')).toBe('bet-error');
    });
  });

  describe('Styling', () => {
    it('uses Flow green color (#00EF8B) for selected prediction button border', () => {
      render(<BettingPanel {...defaultProps} />);

      const rockButton = screen.getByRole('button', { name: /select rock/i });
      fireEvent.click(rockButton);

      expect(rockButton.style.borderColor).toBe('rgb(0, 239, 139)');
    });

    it('uses Flow green color (#00EF8B) for place bet button when enabled', () => {
      render(<BettingPanel {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /select rock/i }));
      const input = screen.getByLabelText(/bet amount/i);
      fireEvent.change(input, { target: { value: '5' } });

      const placeBetButton = screen.getByRole('button', { name: /place bet/i });
      expect(placeBetButton.style.backgroundColor).toBe('rgb(0, 239, 139)');
    });
  });

  describe('Transaction Error Handling', () => {
    it('displays transaction error message when transactionError prop is provided', () => {
      render(
        <BettingPanel
          {...defaultProps}
          transactionError="Insufficient FLOW balance"
        />
      );

      expect(screen.getByText('Transaction Failed')).toBeDefined();
      expect(screen.getByText('Insufficient FLOW balance')).toBeDefined();
    });

    it('shows retry and dismiss buttons when transaction error is displayed', () => {
      render(
        <BettingPanel
          {...defaultProps}
          transactionError="Network error"
        />
      );

      expect(screen.getByRole('button', { name: /retry/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /dismiss/i })).toBeDefined();
    });

    it('calls onClearError and onPlaceBet when retry button is clicked with valid selection', () => {
      const onPlaceBet = vi.fn();
      const onClearError = vi.fn();
      
      render(
        <BettingPanel
          {...defaultProps}
          onPlaceBet={onPlaceBet}
          onClearError={onClearError}
          transactionError="Transaction failed"
        />
      );

      // Select prediction and enter amount first
      fireEvent.click(screen.getByRole('button', { name: /select rock/i }));
      const input = screen.getByLabelText(/bet amount/i);
      fireEvent.change(input, { target: { value: '5' } });

      // Click retry
      fireEvent.click(screen.getByRole('button', { name: /retry/i }));

      expect(onClearError).toHaveBeenCalledTimes(1);
      expect(onPlaceBet).toHaveBeenCalledWith('rock', 5);
    });

    it('calls onClearError when dismiss button is clicked', () => {
      const onClearError = vi.fn();
      
      render(
        <BettingPanel
          {...defaultProps}
          onClearError={onClearError}
          transactionError="Transaction failed"
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));

      expect(onClearError).toHaveBeenCalledTimes(1);
    });

    it('does not display transaction error when transactionError is null', () => {
      render(<BettingPanel {...defaultProps} transactionError={null} />);

      expect(screen.queryByText('Transaction Failed')).toBeNull();
    });

    it('disables retry button when no prediction is selected', () => {
      render(
        <BettingPanel
          {...defaultProps}
          transactionError="Transaction failed"
        />
      );

      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toHaveProperty('disabled', true);
    });

    it('disables retry button when amount is invalid', () => {
      render(
        <BettingPanel
          {...defaultProps}
          balance={5}
          transactionError="Transaction failed"
        />
      );

      // Select prediction but enter invalid amount
      fireEvent.click(screen.getByRole('button', { name: /select rock/i }));
      const input = screen.getByLabelText(/bet amount/i);
      fireEvent.change(input, { target: { value: '10' } }); // Exceeds balance

      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toHaveProperty('disabled', true);
    });

    it('disables retry button when isLoading is true', () => {
      render(
        <BettingPanel
          {...defaultProps}
          isLoading={true}
          transactionError="Transaction failed"
        />
      );

      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toHaveProperty('disabled', true);
    });

    it('has proper accessibility role for transaction error', () => {
      render(
        <BettingPanel
          {...defaultProps}
          transactionError="Network error"
        />
      );

      const errorContainer = screen.getByRole('alert');
      expect(errorContainer).toBeDefined();
      expect(errorContainer.textContent).toContain('Network error');
    });

    it('displays insufficient funds error message correctly', () => {
      render(
        <BettingPanel
          {...defaultProps}
          transactionError="Insufficient FLOW balance"
        />
      );

      expect(screen.getByText('Insufficient FLOW balance')).toBeDefined();
    });

    it('displays validation error from transaction correctly', () => {
      render(
        <BettingPanel
          {...defaultProps}
          transactionError="Bet amount is below the minimum"
        />
      );

      expect(screen.getByText('Bet amount is below the minimum')).toBeDefined();
    });
  });
});
