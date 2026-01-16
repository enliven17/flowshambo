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
        backgroundColor: '#1a1a1a',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '400px',
        width: '100%',
      }}
    >
      {/* Header */}
      <h2
        style={{
          color: FLOW_GREEN,
          fontSize: '20px',
          fontWeight: '600',
          marginBottom: '20px',
          textAlign: 'center',
        }}
      >
        Place Your Bet
      </h2>

      {/* Prediction Selector */}
      <div style={{ marginBottom: '24px' }}>
        <label
          style={{
            display: 'block',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: '500',
            marginBottom: '12px',
          }}
        >
          Select Your Prediction
        </label>
        <div
          className="prediction-selector"
          style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
          }}
        >
          {OBJECT_TYPES.map(({ type, label, emoji }) => (
            <button
              key={type}
              onClick={() => handlePredictionSelect(type)}
              disabled={disabled || isLoading}
              className={`prediction-button prediction-button--${type}`}
              data-selected={selectedPrediction === type}
              style={{
                flex: 1,
                padding: '16px 12px',
                borderRadius: '8px',
                border: `2px solid ${selectedPrediction === type ? FLOW_GREEN : '#333333'}`,
                backgroundColor: selectedPrediction === type ? 'rgba(0, 239, 139, 0.1)' : 'transparent',
                color: selectedPrediction === type ? FLOW_GREEN : '#ffffff',
                cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
                opacity: disabled || isLoading ? 0.5 : 1,
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
              }}
              aria-pressed={selectedPrediction === type}
              aria-label={`Select ${label}`}
            >
              <span style={{ fontSize: '28px' }}>{emoji}</span>
              <span style={{ fontSize: '14px', fontWeight: '500' }}>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Amount Input */}
      <div style={{ marginBottom: '20px' }}>
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
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            Bet Amount (FLOW)
          </label>
          <button
            onClick={handleMaxBet}
            disabled={disabled || isLoading}
            className="max-bet-button"
            style={{
              backgroundColor: 'transparent',
              border: `1px solid ${FLOW_GREEN}`,
              borderRadius: '4px',
              color: FLOW_GREEN,
              fontSize: '12px',
              padding: '4px 8px',
              cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
              opacity: disabled || isLoading ? 0.5 : 1,
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
              padding: '12px 16px',
              paddingRight: '60px',
              borderRadius: '8px',
              border: `2px solid ${validation.errorMessage && touched ? '#ff6b6b' : '#333333'}`,
              backgroundColor: '#0d0d0d',
              color: '#ffffff',
              fontSize: '16px',
              outline: 'none',
              opacity: disabled || isLoading ? 0.5 : 1,
              boxSizing: 'border-box',
            }}
            aria-invalid={!!validation.errorMessage && touched}
            aria-describedby={validation.errorMessage ? 'bet-error' : undefined}
          />
          <span
            style={{
              position: 'absolute',
              right: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#666666',
              fontSize: '14px',
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
              fontSize: '12px',
              marginTop: '8px',
              marginBottom: 0,
            }}
          >
            {validation.errorMessage}
          </p>
        )}
        {/* Min/Max Info */}
        <p
          style={{
            color: '#666666',
            fontSize: '12px',
            marginTop: '8px',
            marginBottom: 0,
          }}
        >
          Min: {minBet} FLOW • Max: {maxBet} FLOW • Balance: {balance.toFixed(4)} FLOW
        </p>
      </div>

      {/* Potential Payout */}
      {potentialPayout > 0 && (
        <div
          className="potential-payout"
          style={{
            backgroundColor: 'rgba(0, 239, 139, 0.1)',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ color: '#ffffff', fontSize: '14px' }}>
            Potential Payout ({PAYOUT_MULTIPLIER}x)
          </span>
          <span
            style={{
              color: FLOW_GREEN,
              fontSize: '18px',
              fontWeight: '600',
            }}
          >
            {potentialPayout.toFixed(4)} FLOW
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
          padding: '16px',
          borderRadius: '8px',
          border: 'none',
          backgroundColor: canPlaceBet ? FLOW_GREEN : '#333333',
          color: canPlaceBet ? '#000000' : '#666666',
          fontSize: '16px',
          fontWeight: '600',
          cursor: canPlaceBet ? 'pointer' : 'not-allowed',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
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
        {isLoading ? 'Placing Bet...' : 'Place Bet'}
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
            padding: '12px 16px',
            marginTop: '16px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
            }}
          >
            <span
              style={{
                color: '#ff6b6b',
                fontSize: '18px',
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
                  fontSize: '14px',
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
                  fontSize: '13px',
                  margin: 0,
                  marginBottom: '12px',
                  opacity: 0.9,
                }}
              >
                {transactionError}
              </p>
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                }}
              >
                <button
                  onClick={handleRetry}
                  disabled={isLoading || !selectedPrediction || parsedAmount <= 0 || !validation.valid}
                  className="retry-button"
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: FLOW_GREEN,
                    color: '#000000',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    opacity: isLoading ? 0.5 : 1,
                    transition: 'opacity 0.2s ease',
                  }}
                >
                  Retry
                </button>
                <button
                  onClick={handleDismissError}
                  className="dismiss-button"
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid #666666',
                    backgroundColor: 'transparent',
                    color: '#ffffff',
                    fontSize: '13px',
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
            fontSize: '12px',
            textAlign: 'center',
            marginTop: '12px',
            marginBottom: 0,
          }}
        >
          Connect your wallet to place a bet
        </p>
      )}

      {/* CSS for spinner animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .prediction-button:hover:not(:disabled) {
          border-color: ${FLOW_GREEN} !important;
        }
        .bet-amount-input:focus {
          border-color: ${FLOW_GREEN} !important;
        }
        .place-bet-button:hover:not(:disabled) {
          opacity: 0.9;
        }
      `}</style>
    </div>
  );
}

export default BettingPanel;
