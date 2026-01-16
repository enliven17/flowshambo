/**
 * LoadingOverlay Component Tests
 * 
 * Tests for the LoadingOverlay component covering:
 * - Visibility based on isVisible prop
 * - Loading messages for different loading types
 * - Subtitle messages for transaction types
 * - Accessibility attributes
 * - Spinner and animation elements
 * 
 * Requirements: 2.7
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingOverlay, getLoadingMessage, getLoadingSubtitle } from './LoadingOverlay';
import type { LoadingType } from '../types';

describe('LoadingOverlay', () => {
  describe('visibility', () => {
    it('should not render when isVisible is false', () => {
      render(
        <LoadingOverlay
          isVisible={false}
          loadingType="placing-bet"
        />
      );

      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('should render when isVisible is true', () => {
      render(
        <LoadingOverlay
          isVisible={true}
          loadingType="placing-bet"
        />
      );

      expect(screen.getByRole('dialog')).toBeDefined();
    });
  });

  describe('loading messages', () => {
    it('should display placing bet message', () => {
      render(
        <LoadingOverlay
          isVisible={true}
          loadingType="placing-bet"
        />
      );

      expect(screen.getByText('Placing your bet...')).toBeDefined();
      expect(screen.getByText('Please confirm the transaction in your wallet')).toBeDefined();
    });

    it('should display revealing game message', () => {
      render(
        <LoadingOverlay
          isVisible={true}
          loadingType="revealing-game"
        />
      );

      expect(screen.getByText('Revealing game...')).toBeDefined();
      expect(screen.getByText('Generating random positions from blockchain')).toBeDefined();
    });

    it('should display settling game message', () => {
      render(
        <LoadingOverlay
          isVisible={true}
          loadingType="settling-game"
        />
      );

      expect(screen.getByText('Settling game...')).toBeDefined();
      expect(screen.getByText('Recording result on-chain')).toBeDefined();
    });

    it('should display wallet connecting message', () => {
      render(
        <LoadingOverlay
          isVisible={true}
          loadingType="wallet-connecting"
        />
      );

      expect(screen.getByText('Connecting wallet...')).toBeDefined();
    });

    it('should display fetching balance message', () => {
      render(
        <LoadingOverlay
          isVisible={true}
          loadingType="fetching-balance"
        />
      );

      expect(screen.getByText('Fetching balance...')).toBeDefined();
    });

    it('should display default message when loadingType is null', () => {
      render(
        <LoadingOverlay
          isVisible={true}
          loadingType={null}
        />
      );

      expect(screen.getByText('Loading...')).toBeDefined();
    });

    it('should display custom message when provided', () => {
      render(
        <LoadingOverlay
          isVisible={true}
          loadingType="placing-bet"
          customMessage="Custom loading message"
        />
      );

      expect(screen.getByText('Custom loading message')).toBeDefined();
      expect(screen.queryByText('Placing your bet...')).toBeNull();
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <LoadingOverlay
          isVisible={true}
          loadingType="placing-bet"
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog.getAttribute('aria-modal')).toBe('true');
      expect(dialog.getAttribute('aria-busy')).toBe('true');
      expect(dialog.getAttribute('aria-label')).toBe('Placing your bet...');
    });

    it('should update aria-label based on loading type', () => {
      render(
        <LoadingOverlay
          isVisible={true}
          loadingType="settling-game"
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog.getAttribute('aria-label')).toBe('Settling game...');
    });
  });

  describe('spinner elements', () => {
    it('should render spinner element', () => {
      render(
        <LoadingOverlay
          isVisible={true}
          loadingType="placing-bet"
        />
      );

      const spinner = document.querySelector('.loading-spinner');
      expect(spinner).toBeDefined();
      expect(spinner).not.toBeNull();
    });

    it('should render pulsing dots', () => {
      render(
        <LoadingOverlay
          isVisible={true}
          loadingType="placing-bet"
        />
      );

      const dots = document.querySelector('.loading-dots');
      expect(dots).toBeDefined();
      expect(dots).not.toBeNull();
      expect(dots?.children.length).toBe(3);
    });
  });

  describe('styling', () => {
    it('should use Flow green color for spinner border', () => {
      render(
        <LoadingOverlay
          isVisible={true}
          loadingType="placing-bet"
        />
      );

      const spinner = document.querySelector('.loading-spinner') as HTMLElement;
      expect(spinner).not.toBeNull();
      // Check that the spinner has the Flow green border-top-color
      expect(spinner.style.borderTopColor).toBe('rgb(0, 239, 139)');
    });

    it('should have full-screen overlay positioning', () => {
      render(
        <LoadingOverlay
          isVisible={true}
          loadingType="placing-bet"
        />
      );

      const overlay = document.querySelector('.loading-overlay') as HTMLElement;
      expect(overlay).not.toBeNull();
      expect(overlay.style.position).toBe('fixed');
      expect(overlay.style.top).toBe('0px');
      expect(overlay.style.left).toBe('0px');
      expect(overlay.style.right).toBe('0px');
      expect(overlay.style.bottom).toBe('0px');
    });
  });
});

describe('getLoadingMessage', () => {
  it('should return correct message for each loading type', () => {
    const testCases: Array<{ type: LoadingType; expected: string }> = [
      { type: 'wallet-connecting', expected: 'Connecting wallet...' },
      { type: 'placing-bet', expected: 'Placing your bet...' },
      { type: 'revealing-game', expected: 'Revealing game...' },
      { type: 'settling-game', expected: 'Settling game...' },
      { type: 'fetching-balance', expected: 'Fetching balance...' },
    ];

    testCases.forEach(({ type, expected }) => {
      expect(getLoadingMessage(type)).toBe(expected);
    });
  });

  it('should return default message for null', () => {
    expect(getLoadingMessage(null)).toBe('Loading...');
  });
});

describe('getLoadingSubtitle', () => {
  it('should return subtitle for transaction types', () => {
    expect(getLoadingSubtitle('placing-bet')).toBe('Please confirm the transaction in your wallet');
    expect(getLoadingSubtitle('revealing-game')).toBe('Generating random positions from blockchain');
    expect(getLoadingSubtitle('settling-game')).toBe('Recording result on-chain');
  });

  it('should return null for non-transaction types', () => {
    expect(getLoadingSubtitle('wallet-connecting')).toBeNull();
    expect(getLoadingSubtitle('fetching-balance')).toBeNull();
  });

  it('should return null for null loading type', () => {
    expect(getLoadingSubtitle(null)).toBeNull();
  });
});
