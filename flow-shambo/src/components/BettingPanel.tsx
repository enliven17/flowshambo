'use client';

import { useState, useCallback, useMemo } from 'react';
import type { ObjectType } from '../types';
import { validateBetAmount, MIN_BET, MAX_BET } from '../lib/betting/validation';

/**
 * Flow green color used throughout the component
 */
const FLOW_GREEN = '#00EF8B';

/**
 * Payout multiplier for winning bets
 */
const PAYOUT_MULTIPLIER = 2.5;

/**
 * Props for the BettingPanel component
 */
export interface BettingPanelProps {
  /** Callback when a bet is placed */
  onPlaceBet: (prediction: ObjectType, amount: number) => void;
  /** User's current wallet balance */
  balance: number;
  /** Minimum bet amount (defaults to MIN_BET) */
  minBet?: number;
  /** Maximum bet amount (defaults to MAX_BET) */
  maxBet?: number;
  /** Whether the panel is disabled (e.g., wallet not connected) */
  disabled?: boolean;
  /** Whether a bet is currently being placed */
  isLoading?: boolean;
  /** Transaction error message from bet placement */
  transactionError?: string | null;
  /** Callback to clear transaction error and retry */
  onClearError?: () => void;
  /** Callback to reset the game (clear stuck receipt) */
  onResetGame?: () => void;
}

/**
 * Object type display configuration
 */
interface ObjectTypeConfig {
  type: ObjectType;
  label: string;
  emoji: string;
}

const OBJECT_TYPES: ObjectTypeConfig[] = [
  { type: 'rock', label: 'Rock', emoji: '🪨' },
  { type: 'paper', label: 'Paper', emoji: '📄' },
  { type: 'scissors', label: 'Scissors', emoji: '✂️' },
];

/**
 * BettingPanel component for placing bets in FlowShambo
 * 
 * Features:
 * - Prediction selector with Rock/Paper/Scissors buttons
 * - Amount input with min/max validation
 * - Place bet button with disabled states
 * - Potential payout display
 * - Flow green styling
 * 
 * @example
 * ```tsx
 * <BettingPanel
 *   onPlaceBet={(prediction, amount) => console.log(prediction, amount)}
 *   balance={10.5}
 *   disabled={!walletConnected}
 * />
 * ```
 * 
 * Requirements: 2.1, 2.2, 2.3
 */
export function BettingPanel({
  onPlaceBet,
  balance,
  minBet = MIN_BET,
  maxBet = MAX_BET,
  disabled = false,
  isLoading = false,
  transactionError = null,
  onClearError,
  onResetGame,
}: BettingPanelProps) {
  const [selectedPrediction, setSelectedPrediction] = useState<ObjectType | null>(null);
  const [betAmount, setBetAmount] = useState<string>('');
  const [touched, setTouched] = useState(false);

  // Parse bet amount as number
  const parsedAmount = useMemo(() => {
    const parsed = parseFloat(betAmount);
    return isNaN(parsed) ? 0 : parsed;
  }, [betAmount]);

  // Validate bet amount
  const validation = useMemo(() => {
    if (!touched && betAmount === '') {
      return { valid: true, errorMessage: null };
    }
    return validateBetAmount(parsedAmount, balance, minBet, maxBet);
  }, [parsedAmount, balance, minBet, maxBet, touched, betAmount]);

  // Calculate potential payout
  const potentialPayout = useMemo(() => {
    if (parsedAmount > 0 && validation.valid) {
      return parsedAmount * PAYOUT_MULTIPLIER;
    }
    return 0;
  }, [parsedAmount, validation.valid]);

  // Check if bet can be placed
  const canPlaceBet = useMemo(() => {
    return (
      !disabled &&
      !isLoading &&
      selectedPrediction !== null &&
      parsedAmount > 0 &&
      validation.valid
    );
  }, [disabled, isLoading, selectedPrediction, parsedAmount, validation.valid]);

  // Handle prediction selection
  const handlePredictionSelect = useCallback((type: ObjectType) => {
    if (!disabled && !isLoading) {
      setSelectedPrediction(type);
    }
  }, [disabled, isLoading]);

  // Handle amount input change
  const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty string or valid number format
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setBetAmount(value);
      setTouched(true);
    }
  }, []);

  // Handle amount input blur
  const handleAmountBlur = useCallback(() => {
    setTouched(true);
  }, []);

  // Handle place bet
  const handlePlaceBet = useCallback(() => {
    if (canPlaceBet && selectedPrediction) {
      onPlaceBet(selectedPrediction, parsedAmount);
    }
  }, [canPlaceBet, selectedPrediction, parsedAmount, onPlaceBet]);

  // Handle retry after transaction error
  const handleRetry = useCallback(() => {
    if (onClearError) {
      onClearError();
    }
    // Attempt to place bet again with current selection
    if (selectedPrediction && parsedAmount > 0 && validation.valid) {
      onPlaceBet(selectedPrediction, parsedAmount);
    }
  }, [onClearError, selectedPrediction, parsedAmount, validation.valid, onPlaceBet]);

  // Handle dismiss error without retry
  const handleDismissError = useCallback(() => {
    if (onClearError) {
      onClearError();
    }
  }, [onClearError]);

  // Handle max bet button
  const handleMaxBet = useCallback(() => {
    const maxAllowed = Math.min(balance, maxBet);
    setBetAmount(maxAllowed.toString());
    setTouched(true);
  }, [balance, maxBet]);

  return (
    <div
      className="betting-panel"
      style={{
        backgroundColor: 'var(--background-surface)',
        borderRadius: '12px',
        padding: 'clamp(20px, 3vw, 28px)',
        border: '1px solid var(--border-default)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        width: '100%',
      }}
    >
      {/* Header */}
      <div
        style={{
          marginBottom: 'clamp(18px, 3vw, 22px)',
          paddingBottom: '14px',
          borderBottom: `1px solid ${FLOW_GREEN}`,
        }}
      >
        <h2
          style={{
            color: FLOW_GREEN,
            fontSize: 'clamp(17px, 3vw, 20px)',
            fontWeight: '700',
            margin: 0,
          }}
        >
          Place Your Bet
        </h2>
        <p
          style={{
            color: 'var(--foreground-secondary)',
            fontSize: 'clamp(11px, 1.8vw, 12px)',
            margin: 0,
            marginTop: '4px',
          }}
        >
          Choose prediction and amount
        </p>
      </div>

      {/* Prediction Selector */}
      <div style={{ marginBottom: 'clamp(18px, 3vw, 22px)' }}>
        <label
          style={{
            display: 'block',
            color: 'var(--foreground)',
            fontSize: 'clamp(12px, 2vw, 14px)',
            fontWeight: '600',
            marginBottom: 'clamp(8px, 1.5vw, 10px)',
          }}
        >
          Your Prediction
        </label>
        <div
          className="prediction-selector"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 'clamp(8px, 1.5vw, 10px)',
          }}
        >
          {OBJECT_TYPES.map(({ type, label }) => (
            <button
              key={type}
              onClick={() => handlePredictionSelect(type)}
              disabled={disabled || isLoading}
              className={`prediction-button prediction-button--${type}`}
              data-selected={selectedPrediction === type}
              style={{
                padding: 'clamp(12px, 2.5vw, 16px) clamp(8px, 1.5vw, 10px)',
                borderRadius: '8px',
                border: `2px solid ${selectedPrediction === type ? FLOW_GREEN : 'var(--border-default)'}`,
                backgroundColor: selectedPrediction === type ? 'rgba(0, 239, 139, 0.15)' : 'var(--background)',
                color: selectedPrediction === type ? FLOW_GREEN : 'var(--foreground)',
                cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
                opacity: disabled || isLoading ? 0.5 : 1,
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 'clamp(4px, 1vw, 6px)',
                boxShadow: selectedPrediction === type ? `0 0 15px rgba(0, 239, 139, 0.3)` : 'none',
                fontSize: 'clamp(13px, 2vw, 15px)',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
              aria-pressed={selectedPrediction === type}
              aria-label={`Select ${label}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Amount Input */}
      <div style={{ marginBottom: 'clamp(16px, 2.5vw, 20px)' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
          }}
        >
          <label
            htmlFor="bet-amount"
            style={{
              color: 'var(--foreground)',
              fontSize: 'clamp(12px, 2vw, 14px)',
              fontWeight: '600',
            }}
          >
            Bet Amount
          </label>
          <button
            onClick={handleMaxBet}
            disabled={disabled || isLoading}
            className="max-bet-button"
            style={{
              backgroundColor: 'rgba(0, 239, 139, 0.1)',
              border: `1px solid ${FLOW_GREEN}`,
              borderRadius: '4px',
              color: FLOW_GREEN,
              fontSize: 'clamp(10px, 1.5vw, 11px)',
              padding: '4px 8px',
              cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
              opacity: disabled || isLoading ? 0.5 : 1,
              fontWeight: '600',
              transition: 'all 0.2s ease',
            }}
          >
            MAX
          </button>
        </div>
        <div style={{ position: 'relative' }}>
          <input
            id="bet-amount"
            type="text"
            inputMode="decimal"
            value={betAmount}
            onChange={handleAmountChange}
            onBlur={handleAmountBlur}
            disabled={disabled || isLoading}
            placeholder={`Min: ${minBet} FLOW`}
            className="bet-amount-input"
            style={{
              width: '100%',
              padding: 'clamp(12px, 1.8vw, 14px) clamp(14px, 2vw, 16px)',
              paddingRight: '70px',
              borderRadius: '10px',
              border: `2px solid ${validation.errorMessage && touched ? '#ff6b6b' : 'var(--border-default)'}`,
              backgroundColor: 'var(--background)',
              color: 'var(--foreground)',
              fontSize: 'clamp(15px, 2.5vw, 17px)',
              fontWeight: '600',
              outline: 'none',
              opacity: disabled || isLoading ? 0.5 : 1,
              boxSizing: 'border-box',
              transition: 'border-color 0.2s ease',
            }}
            aria-invalid={!!validation.errorMessage && touched}
            aria-describedby={validation.errorMessage ? 'bet-error' : undefined}
          />
          <span
            style={{
              position: 'absolute',
              right: 'clamp(14px, 2vw, 16px)',
              top: '50%',
              transform: 'translateY(-50%)',
              color: FLOW_GREEN,
              fontSize: 'clamp(12px, 2vw, 14px)',
              fontWeight: '700',
            }}
          >
            FLOW
          </span>
        </div>
        {/* Validation Error */}
        {validation.errorMessage && touched && (
          <p
            id="bet-error"
            role="alert"
            style={{
              color: '#ff6b6b',
              fontSize: 'clamp(10px, 1.5vw, 11px)',
              marginTop: '6px',
              marginBottom: 0,
            }}
          >
            {validation.errorMessage}
          </p>
        )}
        {/* Min/Max Info */}
        <p
          style={{
            color: 'var(--foreground-secondary)',
            fontSize: 'clamp(10px, 1.5vw, 11px)',
            marginTop: '8px',
            marginBottom: 0,
            wordBreak: 'break-word',
          }}
        >
          Balance: {balance.toFixed(4)} FLOW • Min: {minBet} • Max: {maxBet}
        </p>
      </div>

      {/* Potential Payout */}
      {potentialPayout > 0 && (
        <div
          className="potential-payout"
          style={{
            background: `linear-gradient(135deg, rgba(0, 239, 139, 0.15) 0%, rgba(0, 239, 139, 0.05) 100%)`,
            borderRadius: '10px',
            padding: 'clamp(12px, 1.8vw, 14px) clamp(14px, 2vw, 16px)',
            marginBottom: 'clamp(18px, 2.5vw, 22px)',
            border: `1px solid ${FLOW_GREEN}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div>
            <span style={{ color: 'var(--foreground-secondary)', fontSize: 'clamp(11px, 1.8vw, 12px)', display: 'block' }}>
              Potential Win
            </span>
            <span style={{ color: 'var(--foreground)', fontSize: 'clamp(12px, 2vw, 13px)', fontWeight: '600' }}>
              {PAYOUT_MULTIPLIER}x Multiplier
            </span>
          </div>
          <span
            style={{
              color: FLOW_GREEN,
              fontSize: 'clamp(18px, 3vw, 22px)',
              fontWeight: '700',
            }}
          >
            {potentialPayout.toFixed(2)} FLOW
          </span>
        </div>
      )}

      {/* Place Bet Button */}
      <button
        onClick={handlePlaceBet}
        disabled={!canPlaceBet}
        className="place-bet-button"
        style={{
          width: '100%',
          padding: 'clamp(13px, 2.2vw, 16px)',
          borderRadius: '8px',
          border: 'none',
          background: canPlaceBet 
            ? FLOW_GREEN
            : 'var(--border-default)',
          color: canPlaceBet ? '#000000' : 'var(--foreground-muted)',
          fontSize: 'clamp(14px, 2.5vw, 16px)',
          fontWeight: '700',
          cursor: canPlaceBet ? 'pointer' : 'not-allowed',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          boxShadow: canPlaceBet ? `0 4px 12px rgba(0, 239, 139, 0.3)` : 'none',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
        aria-disabled={!canPlaceBet}
      >
        {isLoading && (
          <span
            className="loading-spinner"
            style={{
              width: '16px',
              height: '16px',
              border: '2px solid #000000',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
            aria-hidden="true"
          />
        )}
        {isLoading ? 'Processing...' : 'Place Bet'}
      </button>

      {/* Transaction Error with Retry */}
      {transactionError && (
        <div
          className="transaction-error"
          role="alert"
          style={{
            backgroundColor: 'rgba(255, 107, 107, 0.1)',
            border: '1px solid #ff6b6b',
            borderRadius: '8px',
            padding: 'clamp(10px, 1.5vw, 12px) clamp(12px, 2vw, 16px)',
            marginTop: 'clamp(12px, 2vw, 16px)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 'clamp(8px, 1.5vw, 12px)',
            }}
          >
            <span
              style={{
                color: '#ff6b6b',
                fontSize: 'clamp(14px, 2.5vw, 18px)',
                lineHeight: '1',
              }}
              aria-hidden="true"
            >
              ⚠️
            </span>
            <div style={{ flex: 1 }}>
              <p
                style={{
                  color: '#ff6b6b',
                  fontSize: 'clamp(12px, 2vw, 14px)',
                  fontWeight: '500',
                  margin: 0,
                  marginBottom: '8px',
                }}
              >
                Transaction Failed
              </p>
              <p
                style={{
                  color: '#ffffff',
                  fontSize: 'clamp(11px, 1.8vw, 13px)',
                  margin: 0,
                  marginBottom: 'clamp(8px, 1.5vw, 12px)',
                  opacity: 0.9,
                  wordBreak: 'break-word',
                }}
              >
                {transactionError}
              </p>
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  flexWrap: 'wrap',
                }}
              >
                <button
                  onClick={handleRetry}
                  disabled={isLoading || !selectedPrediction || parsedAmount <= 0 || !validation.valid}
                  className="retry-button"
                  style={{
                    padding: 'clamp(6px, 1vw, 8px) clamp(12px, 2vw, 16px)',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: FLOW_GREEN,
                    color: '#000000',
                    fontSize: 'clamp(11px, 1.8vw, 13px)',
                    fontWeight: '600',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    opacity: isLoading ? 0.5 : 1,
                    transition: 'opacity 0.2s ease',
                  }}
                >
                  Retry
                </button>

                {/* Reset Game Button for Stuck Games */}
                {transactionError && transactionError.includes('already in progress') && onResetGame && (
                  <button
                    onClick={() => {
                      onResetGame();
                      if (onClearError) onClearError();
                    }}
                    className="reset-button"
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: '1px solid #ff6b6b',
                      backgroundColor: 'rgba(255, 107, 107, 0.1)',
                      color: '#ff6b6b',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    Reset Game
                  </button>
                )}

                <button
                  onClick={handleDismissError}
                  className="dismiss-button"
                  style={{
                    padding: 'clamp(6px, 1vw, 8px) clamp(12px, 2vw, 16px)',
                    borderRadius: '6px',
                    border: '1px solid #666666',
                    backgroundColor: 'transparent',
                    color: '#ffffff',
                    fontSize: 'clamp(11px, 1.8vw, 13px)',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s ease',
                  }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Disabled Message */}
      {disabled && (
        <p
          style={{
            color: '#ff6b6b',
            fontSize: 'clamp(11px, 1.8vw, 12px)',
            textAlign: 'center',
            marginTop: 'clamp(12px, 2vw, 14px)',
            marginBottom: 0,
            padding: '8px',
            backgroundColor: 'rgba(255, 107, 107, 0.1)',
            borderRadius: '6px',
            border: '1px solid rgba(255, 107, 107, 0.3)',
          }}
        >
          Connect your wallet to start betting
        </p>
      )}

      {/* CSS for spinner animation and hover effects */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .prediction-button:hover:not(:disabled):not([data-selected="true"]) {
          border-color: ${FLOW_GREEN} !important;
          background-color: rgba(0, 239, 139, 0.05) !important;
        }
        .bet-amount-input:focus {
          border-color: ${FLOW_GREEN} !important;
          box-shadow: 0 0 0 3px rgba(0, 239, 139, 0.1) !important;
        }
        .place-bet-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 239, 139, 0.5) !important;
        }
        .place-bet-button:active:not(:disabled) {
          transform: translateY(0);
        }
        .max-bet-button:hover:not(:disabled) {
          background-color: rgba(0, 239, 139, 0.2) !important;
        }
      `}</style>
    </div>
  );
}

export default BettingPanel;
