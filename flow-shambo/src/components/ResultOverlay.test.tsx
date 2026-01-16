/**
 * Tests for ResultOverlay Component
 *
 * Tests the game result display including:
 * - Win/lose message display
 * - Payout amount formatting
 * - Winning type with emoji
 * - Play again button functionality
 * - Win/lose animations
 *
 * **Validates: Requirements 6.5, 7.6, 7.7**
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  ResultOverlay,
  formatPayout,
  FLOW_GREEN,
  LOSE_COLOR,
  OBJECT_EMOJIS,
  OBJECT_NAMES,
} from './ResultOverlay';
import type { ObjectType } from '../types/game';

describe('ResultOverlay', () => {
  // Mock requestAnimationFrame and cancelAnimationFrame
  let rafCallbacks: ((time: number) => void)[] = [];
  let rafId = 0;

  beforeEach(() => {
    rafCallbacks = [];
    rafId = 0;
    vi.useFakeTimers();
    
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      rafCallbacks.push(callback);
      return ++rafId;
    });
    
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {
      // No-op for tests
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('formatPayout', () => {
    it('formats payout to 4 decimal places', () => {
      expect(formatPayout(2.5)).toBe('2.5000');
      expect(formatPayout(0)).toBe('0.0000');
      expect(formatPayout(1.23456789)).toBe('1.2346');
      expect(formatPayout(100)).toBe('100.0000');
    });

    it('handles small decimal values', () => {
      expect(formatPayout(0.0001)).toBe('0.0001');
      expect(formatPayout(0.00001)).toBe('0.0000');
    });
  });

  describe('Win State', () => {
    const winProps = {
      winner: 'rock' as ObjectType,
      playerWon: true,
      payout: 2.5,
      onPlayAgain: vi.fn(),
    };

    it('renders win message', () => {
      render(<ResultOverlay {...winProps} />);
      
      const resultMessage = screen.getByTestId('result-message');
      expect(resultMessage).toBeDefined();
      expect(resultMessage.textContent).toBe('You Won!');
    });

    it('displays winning type with emoji', () => {
      render(<ResultOverlay {...winProps} />);
      
      const winnerEmoji = screen.getByTestId('winner-emoji');
      const winnerType = screen.getByTestId('winner-type');
      
      expect(winnerEmoji.textContent).toBe(OBJECT_EMOJIS.rock);
      expect(winnerType.textContent).toBe('Rock Wins!');
    });

    it('shows payout amount formatted to 4 decimal places', () => {
      render(<ResultOverlay {...winProps} />);
      
      const payoutAmount = screen.getByTestId('payout-amount');
      expect(payoutAmount.textContent).toBe('+2.5000 FLOW');
    });

    it('uses Flow green color for win styling', () => {
      render(<ResultOverlay {...winProps} />);
      
      const resultMessage = screen.getByTestId('result-message');
      expect(resultMessage.style.color).toBe('rgb(0, 239, 139)'); // FLOW_GREEN in RGB
    });

    it('renders confetti particles for win animation', async () => {
      render(<ResultOverlay {...winProps} />);
      
      // Wait for content to appear
      await vi.advanceTimersByTimeAsync(300);
      
      // Confetti should be rendered
      const confettiParticles = screen.queryAllByTestId('confetti-particle');
      expect(confettiParticles.length).toBeGreaterThan(0);
    });
  });

  describe('Lose State', () => {
    const loseProps = {
      winner: 'scissors' as ObjectType,
      playerWon: false,
      payout: 0,
      onPlayAgain: vi.fn(),
    };

    it('renders lose message', () => {
      render(<ResultOverlay {...loseProps} />);
      
      const resultMessage = screen.getByTestId('result-message');
      expect(resultMessage).toBeDefined();
      expect(resultMessage.textContent).toBe('You Lost');
    });

    it('displays winning type with emoji', () => {
      render(<ResultOverlay {...loseProps} />);
      
      const winnerEmoji = screen.getByTestId('winner-emoji');
      const winnerType = screen.getByTestId('winner-type');
      
      expect(winnerEmoji.textContent).toBe(OBJECT_EMOJIS.scissors);
      expect(winnerType.textContent).toBe('Scissors Wins!');
    });

    it('shows zero payout for loss', () => {
      render(<ResultOverlay {...loseProps} />);
      
      const payoutAmount = screen.getByTestId('payout-amount');
      expect(payoutAmount.textContent).toBe('0.0000 FLOW');
    });

    it('uses lose color for lose styling', () => {
      render(<ResultOverlay {...loseProps} />);
      
      const resultMessage = screen.getByTestId('result-message');
      expect(resultMessage.style.color).toBe('rgb(255, 107, 107)'); // LOSE_COLOR in RGB
    });

    it('does not render confetti for lose state', async () => {
      render(<ResultOverlay {...loseProps} />);
      
      // Wait for animations
      await vi.advanceTimersByTimeAsync(300);
      
      // No confetti should be rendered for loss
      const confettiParticles = screen.queryAllByTestId('confetti-particle');
      expect(confettiParticles.length).toBe(0);
    });
  });

  describe('Play Again Button', () => {
    it('renders play again button', () => {
      const onPlayAgain = vi.fn();
      render(
        <ResultOverlay
          winner="paper"
          playerWon={true}
          payout={5}
          onPlayAgain={onPlayAgain}
        />
      );
      
      const button = screen.getByTestId('play-again-button');
      expect(button).toBeDefined();
      expect(button.textContent).toBe('Play Again');
    });

    it('calls onPlayAgain when clicked', () => {
      const onPlayAgain = vi.fn();
      render(
        <ResultOverlay
          winner="paper"
          playerWon={true}
          payout={5}
          onPlayAgain={onPlayAgain}
        />
      );
      
      fireEvent.click(screen.getByTestId('play-again-button'));
      
      expect(onPlayAgain).toHaveBeenCalledTimes(1);
    });

    it('has Flow green background color', () => {
      render(
        <ResultOverlay
          winner="paper"
          playerWon={true}
          payout={5}
          onPlayAgain={vi.fn()}
        />
      );
      
      const button = screen.getByTestId('play-again-button');
      expect(button.style.backgroundColor).toBe('rgb(0, 239, 139)'); // FLOW_GREEN in RGB
    });
  });

  describe('Visibility Control', () => {
    it('renders when isVisible is true', () => {
      render(
        <ResultOverlay
          winner="rock"
          playerWon={true}
          payout={2.5}
          onPlayAgain={vi.fn()}
          isVisible={true}
        />
      );
      
      const overlay = screen.getByTestId('result-overlay');
      expect(overlay).toBeDefined();
    });

    it('does not render when isVisible is false', () => {
      render(
        <ResultOverlay
          winner="rock"
          playerWon={true}
          payout={2.5}
          onPlayAgain={vi.fn()}
          isVisible={false}
        />
      );
      
      const overlay = screen.queryByTestId('result-overlay');
      expect(overlay).toBeNull();
    });

    it('defaults to visible when isVisible is not provided', () => {
      render(
        <ResultOverlay
          winner="rock"
          playerWon={true}
          payout={2.5}
          onPlayAgain={vi.fn()}
        />
      );
      
      const overlay = screen.getByTestId('result-overlay');
      expect(overlay).toBeDefined();
    });
  });

  describe('All Object Types', () => {
    const objectTypes: ObjectType[] = ['rock', 'paper', 'scissors'];

    objectTypes.forEach((type) => {
      it(`displays correct emoji and name for ${type}`, () => {
        render(
          <ResultOverlay
            winner={type}
            playerWon={true}
            payout={1}
            onPlayAgain={vi.fn()}
          />
        );
        
        const winnerEmoji = screen.getByTestId('winner-emoji');
        const winnerType = screen.getByTestId('winner-type');
        
        expect(winnerEmoji.textContent).toBe(OBJECT_EMOJIS[type]);
        expect(winnerType.textContent).toBe(`${OBJECT_NAMES[type]} Wins!`);
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(
        <ResultOverlay
          winner="rock"
          playerWon={true}
          payout={2.5}
          onPlayAgain={vi.fn()}
        />
      );
      
      const overlay = screen.getByTestId('result-overlay');
      expect(overlay.getAttribute('role')).toBe('dialog');
      expect(overlay.getAttribute('aria-modal')).toBe('true');
      expect(overlay.getAttribute('aria-labelledby')).toBe('result-title');
    });

    it('play again button has aria-label', () => {
      render(
        <ResultOverlay
          winner="rock"
          playerWon={true}
          payout={2.5}
          onPlayAgain={vi.fn()}
        />
      );
      
      const button = screen.getByTestId('play-again-button');
      expect(button.getAttribute('aria-label')).toBe('Play Again');
    });

    it('winner emoji has aria-label', () => {
      render(
        <ResultOverlay
          winner="scissors"
          playerWon={true}
          payout={2.5}
          onPlayAgain={vi.fn()}
        />
      );
      
      const emoji = screen.getByTestId('winner-emoji');
      expect(emoji.getAttribute('aria-label')).toBe('Scissors');
    });
  });

  describe('Payout Display', () => {
    it('shows positive sign for win payout', () => {
      render(
        <ResultOverlay
          winner="rock"
          playerWon={true}
          payout={2.5}
          onPlayAgain={vi.fn()}
        />
      );
      
      const payoutAmount = screen.getByTestId('payout-amount');
      expect(payoutAmount.textContent).toBe('+2.5000 FLOW');
    });

    it('shows no sign for loss payout', () => {
      render(
        <ResultOverlay
          winner="rock"
          playerWon={false}
          payout={0}
          onPlayAgain={vi.fn()}
        />
      );
      
      const payoutAmount = screen.getByTestId('payout-amount');
      expect(payoutAmount.textContent).toBe('0.0000 FLOW');
    });

    it('handles large payout amounts', () => {
      render(
        <ResultOverlay
          winner="rock"
          playerWon={true}
          payout={1000.5}
          onPlayAgain={vi.fn()}
        />
      );
      
      const payoutAmount = screen.getByTestId('payout-amount');
      expect(payoutAmount.textContent).toBe('+1000.5000 FLOW');
    });

    it('handles small payout amounts', () => {
      render(
        <ResultOverlay
          winner="rock"
          playerWon={true}
          payout={0.0001}
          onPlayAgain={vi.fn()}
        />
      );
      
      const payoutAmount = screen.getByTestId('payout-amount');
      expect(payoutAmount.textContent).toBe('+0.0001 FLOW');
    });
  });

  describe('Custom className', () => {
    it('applies custom className to overlay', () => {
      render(
        <ResultOverlay
          winner="rock"
          playerWon={true}
          payout={2.5}
          onPlayAgain={vi.fn()}
          className="custom-class"
        />
      );
      
      const overlay = screen.getByTestId('result-overlay');
      expect(overlay.classList.contains('custom-class')).toBe(true);
    });
  });

  describe('Constants', () => {
    it('exports correct FLOW_GREEN color', () => {
      expect(FLOW_GREEN).toBe('#00EF8B');
    });

    it('exports correct LOSE_COLOR', () => {
      expect(LOSE_COLOR).toBe('#FF6B6B');
    });

    it('exports correct object emojis', () => {
      expect(OBJECT_EMOJIS.rock).toBe('🪨');
      expect(OBJECT_EMOJIS.paper).toBe('📄');
      expect(OBJECT_EMOJIS.scissors).toBe('✂️');
    });

    it('exports correct object names', () => {
      expect(OBJECT_NAMES.rock).toBe('Rock');
      expect(OBJECT_NAMES.paper).toBe('Paper');
      expect(OBJECT_NAMES.scissors).toBe('Scissors');
    });
  });
});
