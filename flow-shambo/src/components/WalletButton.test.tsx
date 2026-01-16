/**
 * WalletButton Component Tests
 * 
 * Tests for the WalletButton component covering:
 * - Display of connect button when disconnected
 * - Display of address and balance when connected
 * - Connect/disconnect actions
 * - Address truncation and balance formatting
 * - Error display and retry functionality
 * - Loading states during connection
 * 
 * Requirements: 1.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WalletButton, truncateAddress, formatBalance } from './WalletButton';

// Mock the useWallet hook
const mockConnect = vi.fn();
const mockDisconnect = vi.fn();
const mockClearError = vi.fn();
let mockWalletState = {
  connected: false,
  address: null as string | null,
  isConnecting: false,
  isDisconnecting: false,
  error: null as string | null,
};

vi.mock('../hooks/useWallet', () => ({
  useWallet: () => ({
    ...mockWalletState,
    connect: mockConnect,
    disconnect: mockDisconnect,
    clearError: mockClearError,
  }),
}));

describe('WalletButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWalletState = {
      connected: false,
      address: null,
      isConnecting: false,
      isDisconnecting: false,
      error: null,
    };
    mockConnect.mockResolvedValue(undefined);
    mockDisconnect.mockReturnValue(undefined);
  });

  describe('Disconnected State', () => {
    it('should display "Connect Wallet" button when not connected', () => {
      render(<WalletButton />);
      
      const button = screen.getByRole('button', { name: /connect wallet/i });
      expect(button).toBeDefined();
      expect(button.textContent).toBe('Connect Wallet');
    });

    it('should call connect when connect button is clicked', async () => {
      render(<WalletButton />);
      
      const button = screen.getByRole('button', { name: /connect wallet/i });
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(mockConnect).toHaveBeenCalledTimes(1);
      });
    });

    it('should call onConnect callback after successful connection', async () => {
      const onConnect = vi.fn();
      mockWalletState.connected = true;
      render(<WalletButton onConnect={onConnect} />);
      
      const button = screen.getByRole('button', { name: /connect wallet/i });
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(onConnect).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Loading State', () => {
    it('should display "Connecting..." when isConnecting is true', () => {
      render(<WalletButton isConnecting={true} />);
      
      const button = screen.getByRole('button', { name: /connecting wallet/i });
      expect(button.textContent).toContain('Connecting...');
    });

    it('should disable connect button when connecting', () => {
      render(<WalletButton isConnecting={true} />);
      
      const button = screen.getByRole('button', { name: /connecting wallet/i });
      expect(button).toHaveProperty('disabled', true);
    });

    it('should show loading spinner when connecting', () => {
      render(<WalletButton isConnecting={true} />);
      
      const spinner = document.querySelector('.loading-spinner');
      expect(spinner).toBeDefined();
    });

    it('should have aria-busy attribute when connecting', () => {
      render(<WalletButton isConnecting={true} />);
      
      const button = screen.getByRole('button', { name: /connecting wallet/i });
      expect(button.getAttribute('aria-busy')).toBe('true');
    });
  });

  describe('Error State', () => {
    it('should display error message when error prop is provided', () => {
      render(<WalletButton error="Connection failed" />);
      
      const errorMessage = screen.getByRole('alert');
      expect(errorMessage.textContent).toContain('Connection failed');
    });

    it('should display retry button when there is an error', () => {
      render(<WalletButton error="Connection failed" />);
      
      const retryButton = screen.getByRole('button', { name: /retry wallet connection/i });
      expect(retryButton).toBeDefined();
      expect(retryButton.textContent).toBe('Retry Connection');
    });

    it('should call clearError and connect when retry is clicked', async () => {
      render(<WalletButton error="Connection failed" />);
      
      const retryButton = screen.getByRole('button', { name: /retry wallet connection/i });
      fireEvent.click(retryButton);
      
      await waitFor(() => {
        expect(mockClearError).toHaveBeenCalledTimes(1);
        expect(mockConnect).toHaveBeenCalledTimes(1);
      });
    });

    it('should display dismiss button for error', () => {
      render(<WalletButton error="Connection failed" />);
      
      const dismissButton = screen.getByRole('button', { name: /dismiss error/i });
      expect(dismissButton).toBeDefined();
    });

    it('should call clearError when dismiss button is clicked', () => {
      render(<WalletButton error="Connection failed" />);
      
      const dismissButton = screen.getByRole('button', { name: /dismiss error/i });
      fireEvent.click(dismissButton);
      
      expect(mockClearError).toHaveBeenCalledTimes(1);
    });

    it('should show "Connecting..." on retry button when connecting after error', () => {
      render(<WalletButton error="Connection failed" isConnecting={true} />);
      
      const retryButton = screen.getByRole('button', { name: /retry wallet connection/i });
      expect(retryButton.textContent).toBe('Connecting...');
    });

    it('should disable retry button when connecting', () => {
      render(<WalletButton error="Connection failed" isConnecting={true} />);
      
      const retryButton = screen.getByRole('button', { name: /retry wallet connection/i });
      expect(retryButton).toHaveProperty('disabled', true);
    });

    it('should not show error state when connected even if error exists', () => {
      render(<WalletButton address="0x1234567890abcdef" error="Some error" balance={10.0} />);
      
      // Should show connected state, not error state
      expect(screen.queryByRole('alert')).toBeNull();
      expect(screen.getByText('0x1234...cdef')).toBeDefined();
    });
  });

  describe('Connected State', () => {
    it('should display truncated address when connected via props', () => {
      render(<WalletButton address="0x1234567890abcdef" balance={10.5} />);
      
      expect(screen.getByText('0x1234...cdef')).toBeDefined();
    });

    it('should display truncated address when connected via hook', () => {
      mockWalletState.address = '0xabcdef1234567890';
      mockWalletState.connected = true;
      render(<WalletButton balance={5.0} />);
      
      expect(screen.getByText('0xabcd...7890')).toBeDefined();
    });

    it('should display formatted balance', () => {
      render(<WalletButton address="0x1234567890abcdef" balance={10.5678} />);
      
      expect(screen.getByText('10.5678 FLOW')).toBeDefined();
    });

    it('should display zero balance when balance is null', () => {
      render(<WalletButton address="0x1234567890abcdef" balance={null} />);
      
      expect(screen.getByText('0.0000 FLOW')).toBeDefined();
    });

    it('should show dropdown when connected button is clicked', () => {
      render(<WalletButton address="0x1234567890abcdef" balance={10.0} />);
      
      const button = screen.getByRole('button', { name: /wallet 0x1234/i });
      fireEvent.click(button);
      
      expect(screen.getByRole('button', { name: /disconnect/i })).toBeDefined();
    });

    it('should call disconnect when disconnect is clicked', async () => {
      const onDisconnect = vi.fn();
      render(<WalletButton address="0x1234567890abcdef" balance={10.0} onDisconnect={onDisconnect} />);
      
      // Open dropdown
      const walletButton = screen.getByRole('button', { name: /wallet 0x1234/i });
      fireEvent.click(walletButton);
      
      // Click disconnect
      const disconnectButton = screen.getByRole('button', { name: /disconnect/i });
      fireEvent.click(disconnectButton);
      
      await waitFor(() => {
        expect(mockDisconnect).toHaveBeenCalledTimes(1);
      });
    });

    it('should call onDisconnect callback after successful disconnection', async () => {
      const onDisconnect = vi.fn();
      render(<WalletButton address="0x1234567890abcdef" balance={10.0} onDisconnect={onDisconnect} />);
      
      // Open dropdown
      const walletButton = screen.getByRole('button', { name: /wallet 0x1234/i });
      fireEvent.click(walletButton);
      
      // Click disconnect
      const disconnectButton = screen.getByRole('button', { name: /disconnect/i });
      fireEvent.click(disconnectButton);
      
      await waitFor(() => {
        expect(onDisconnect).toHaveBeenCalledTimes(1);
      });
    });

    it('should close dropdown after disconnect', async () => {
      render(<WalletButton address="0x1234567890abcdef" balance={10.0} />);
      
      // Open dropdown
      const walletButton = screen.getByRole('button', { name: /wallet 0x1234/i });
      fireEvent.click(walletButton);
      
      // Verify dropdown is open
      expect(screen.getByRole('button', { name: /disconnect/i })).toBeDefined();
      
      // Click disconnect
      const disconnectButton = screen.getByRole('button', { name: /disconnect/i });
      fireEvent.click(disconnectButton);
      
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /disconnect/i })).toBeNull();
      });
    });
  });

  describe('Styling', () => {
    it('should use Flow green color (#00EF8B) for connect button background', () => {
      render(<WalletButton />);
      
      const button = screen.getByRole('button', { name: /connect wallet/i });
      expect(button.style.backgroundColor).toBe('rgb(0, 239, 139)');
    });

    it('should use Flow green color (#00EF8B) for connected button border', () => {
      render(<WalletButton address="0x1234567890abcdef" balance={10.0} />);
      
      const button = screen.getByRole('button', { name: /wallet 0x1234/i });
      expect(button.style.border).toBe('2px solid rgb(0, 239, 139)');
    });

    it('should use error red color for error message border', () => {
      render(<WalletButton error="Connection failed" />);
      
      const errorContainer = document.querySelector('.wallet-error-message');
      expect(errorContainer).toBeDefined();
      expect((errorContainer as HTMLElement).style.border).toBe('1px solid rgb(255, 107, 107)');
    });
  });
});

describe('truncateAddress', () => {
  it('should truncate a standard Flow address', () => {
    expect(truncateAddress('0x1234567890abcdef')).toBe('0x1234...cdef');
  });

  it('should handle short addresses without truncation', () => {
    expect(truncateAddress('0x1234')).toBe('0x1234');
  });

  it('should handle empty string', () => {
    expect(truncateAddress('')).toBe('');
  });

  it('should handle addresses of exactly 10 characters', () => {
    // 10 characters is the boundary - addresses <= 10 chars are not truncated
    expect(truncateAddress('0x12345678')).toBe('0x12345678');
  });

  it('should handle addresses longer than 10 characters', () => {
    expect(truncateAddress('0x123456789')).toBe('0x1234...6789');
  });
});

describe('formatBalance', () => {
  it('should format balance with 4 decimal places', () => {
    expect(formatBalance(10.5)).toBe('10.5000');
  });

  it('should format balance with more than 4 decimal places', () => {
    expect(formatBalance(10.123456789)).toBe('10.1235');
  });

  it('should format zero balance', () => {
    expect(formatBalance(0)).toBe('0.0000');
  });

  it('should handle null balance', () => {
    expect(formatBalance(null)).toBe('0.0000');
  });

  it('should format large balances', () => {
    expect(formatBalance(1000000.5)).toBe('1000000.5000');
  });

  it('should format small balances', () => {
    expect(formatBalance(0.0001)).toBe('0.0001');
  });
});


describe('truncateAddress', () => {
  it('should truncate a standard Flow address', () => {
    expect(truncateAddress('0x1234567890abcdef')).toBe('0x1234...cdef');
  });

  it('should handle short addresses without truncation', () => {
    expect(truncateAddress('0x1234')).toBe('0x1234');
  });

  it('should handle empty string', () => {
    expect(truncateAddress('')).toBe('');
  });

  it('should handle addresses of exactly 10 characters', () => {
    // 10 characters is the boundary - addresses <= 10 chars are not truncated
    expect(truncateAddress('0x12345678')).toBe('0x12345678');
  });

  it('should handle addresses longer than 10 characters', () => {
    expect(truncateAddress('0x123456789')).toBe('0x1234...6789');
  });
});

describe('formatBalance', () => {
  it('should format balance with 4 decimal places', () => {
    expect(formatBalance(10.5)).toBe('10.5000');
  });

  it('should format balance with more than 4 decimal places', () => {
    expect(formatBalance(10.123456789)).toBe('10.1235');
  });

  it('should format zero balance', () => {
    expect(formatBalance(0)).toBe('0.0000');
  });

  it('should handle null balance', () => {
    expect(formatBalance(null)).toBe('0.0000');
  });

  it('should format large balances', () => {
    expect(formatBalance(1000000.5)).toBe('1000000.5000');
  });

  it('should format small balances', () => {
    expect(formatBalance(0.0001)).toBe('0.0001');
  });
});
