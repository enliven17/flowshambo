/**
 * useWallet Hook Tests
 * 
 * Tests for the useWallet hook covering:
 * - Connection state management
 * - Connect/disconnect actions
 * - Error handling
 * - Connection persistence
 * 
 * Requirements: 1.3, 1.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWallet } from './useWallet';

// Mock the @onflow/react-sdk hooks
const mockAuthenticate = vi.fn();
const mockUnauthenticate = vi.fn();
let mockUser: { addr: string | null; loggedIn?: boolean } | null = null;

vi.mock('@onflow/react-sdk', () => ({
  useFlowCurrentUser: () => ({
    user: mockUser,
    authenticate: mockAuthenticate,
    unauthenticate: mockUnauthenticate,
  }),
}));

describe('useWallet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = null;
    mockAuthenticate.mockResolvedValue(undefined);
    mockUnauthenticate.mockReturnValue(undefined);
  });

  describe('Initial State', () => {
    it('should return disconnected state when no user is logged in', () => {
      const { result } = renderHook(() => useWallet());
      
      expect(result.current.connected).toBe(false);
      expect(result.current.address).toBeNull();
      expect(result.current.isConnecting).toBe(false);
      expect(result.current.isDisconnecting).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should return connected state when user is logged in', () => {
      mockUser = { addr: '0x1234567890abcdef', loggedIn: true };
      const { result } = renderHook(() => useWallet());
      
      expect(result.current.connected).toBe(true);
      expect(result.current.address).toBe('0x1234567890abcdef');
    });
  });

  describe('connect', () => {
    it('should call authenticate when connect is called', async () => {
      const { result } = renderHook(() => useWallet());
      
      await act(async () => {
        await result.current.connect();
      });
      
      expect(mockAuthenticate).toHaveBeenCalledTimes(1);
    });

    it('should set isConnecting to true during connection', async () => {
      let resolveAuth: () => void;
      mockAuthenticate.mockImplementation(() => new Promise(resolve => {
        resolveAuth = resolve;
      }));
      
      const { result } = renderHook(() => useWallet());
      
      // Start connecting
      act(() => {
        result.current.connect();
      });
      
      // Should be connecting
      expect(result.current.isConnecting).toBe(true);
      
      // Resolve authentication
      await act(async () => {
        resolveAuth!();
      });
      
      // Should no longer be connecting
      expect(result.current.isConnecting).toBe(false);
    });

    it('should set error when connection fails', async () => {
      const errorMessage = 'Connection rejected by user';
      mockAuthenticate.mockRejectedValue(new Error(errorMessage));
      
      const { result } = renderHook(() => useWallet());
      
      await act(async () => {
        await result.current.connect();
      });
      
      expect(result.current.error).toBe(errorMessage);
      expect(result.current.isConnecting).toBe(false);
    });

    it('should not call authenticate if already connecting', async () => {
      let resolveAuth: () => void;
      mockAuthenticate.mockImplementation(() => new Promise(resolve => {
        resolveAuth = resolve;
      }));
      
      const { result } = renderHook(() => useWallet());
      
      // Start first connection
      act(() => {
        result.current.connect();
      });
      
      // Try to connect again while still connecting
      act(() => {
        result.current.connect();
      });
      
      // Should only have been called once
      expect(mockAuthenticate).toHaveBeenCalledTimes(1);
      
      // Cleanup
      await act(async () => {
        resolveAuth!();
      });
    });
  });

  describe('disconnect', () => {
    it('should call unauthenticate when disconnect is called', () => {
      mockUser = { addr: '0x1234567890abcdef', loggedIn: true };
      const { result } = renderHook(() => useWallet());
      
      act(() => {
        result.current.disconnect();
      });
      
      expect(mockUnauthenticate).toHaveBeenCalledTimes(1);
    });

    it('should handle disconnect errors gracefully', () => {
      mockUser = { addr: '0x1234567890abcdef', loggedIn: true };
      mockUnauthenticate.mockImplementation(() => {
        throw new Error('Disconnect failed');
      });
      
      const { result } = renderHook(() => useWallet());
      
      act(() => {
        result.current.disconnect();
      });
      
      expect(result.current.error).toBe('Disconnect failed');
    });
  });

  describe('clearError', () => {
    it('should clear error state', async () => {
      mockAuthenticate.mockRejectedValue(new Error('Connection failed'));
      
      const { result } = renderHook(() => useWallet());
      
      // Trigger an error
      await act(async () => {
        await result.current.connect();
      });
      
      expect(result.current.error).toBe('Connection failed');
      
      // Clear the error
      act(() => {
        result.current.clearError();
      });
      
      expect(result.current.error).toBeNull();
    });
  });

  describe('Connection Persistence', () => {
    it('should reflect persisted connection state from FCL', () => {
      // Simulate FCL having restored a session
      mockUser = { addr: '0xpersistedaddress', loggedIn: true };
      
      const { result } = renderHook(() => useWallet());
      
      // Should immediately show as connected
      expect(result.current.connected).toBe(true);
      expect(result.current.address).toBe('0xpersistedaddress');
    });

    it('should update when user state changes', () => {
      const { result, rerender } = renderHook(() => useWallet());
      
      // Initially disconnected
      expect(result.current.connected).toBe(false);
      
      // Simulate user logging in
      mockUser = { addr: '0xnewaddress', loggedIn: true };
      rerender();
      
      // Should now be connected
      expect(result.current.connected).toBe(true);
      expect(result.current.address).toBe('0xnewaddress');
    });
  });
});
