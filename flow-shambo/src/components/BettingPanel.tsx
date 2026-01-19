'use client';

import { useState, useCallback, useMemo } from 'react';
import type { ObjectType } from '../types';
import { validateBetAmount, MIN_BET, MAX_BET } from '../lib/betting/validation';

const PAYOUT_MULTIPLIER = 2.5;

export interface BettingPanelProps {
  onPlaceBet: (prediction: ObjectType, amount: number) => void;
  balance: number;
  minBet?: number;
  maxBet?: number;
  disabled?: boolean;
  isLoading?: boolean;
  transactionError?: string | null;
  onClearError?: () => void;
  onResetGame?: () => void;
}

// SVG Icons for game objects (unused currently, using game-consistent styling)

interface ObjectTypeConfig {
  type: ObjectType;
  label: string;
  icon: string;
  color: string;
}

const OBJECT_TYPES: ObjectTypeConfig[] = [
  {
    type: 'rock',
    label: 'Rock',
    icon: '✊',
    color: '#FF6B6B'
  },
  {
    type: 'paper',
    label: 'Paper',
    icon: '✋',
    color: '#4CC9F0'
  },
  {
    type: 'scissors',
    label: 'Scissors',
    icon: '✌️',
    color: '#FCC719'
  },
];

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

  const parsedAmount = useMemo(() => {
    const parsed = parseFloat(betAmount);
    return isNaN(parsed) ? 0 : parsed;
  }, [betAmount]);

  const validation = useMemo(() => {
    if (!touched && betAmount === '') return { valid: true, errorMessage: null };
    return validateBetAmount(parsedAmount, balance, minBet, maxBet);
  }, [parsedAmount, balance, minBet, maxBet, touched, betAmount]);

  const potentialPayout = useMemo(() => {
    if (parsedAmount > 0 && validation.valid) return parsedAmount * PAYOUT_MULTIPLIER;
    return 0;
  }, [parsedAmount, validation.valid]);

  const canPlaceBet = useMemo(() => {
    return !disabled && !isLoading && selectedPrediction !== null && parsedAmount > 0 && validation.valid;
  }, [disabled, isLoading, selectedPrediction, parsedAmount, validation.valid]);

  const handlePredictionSelect = useCallback((type: ObjectType) => {
    if (!disabled && !isLoading) setSelectedPrediction(type);
  }, [disabled, isLoading]);

  const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setBetAmount(value);
      setTouched(true);
    }
  }, []);

  const handleAmountBlur = useCallback(() => setTouched(true), []);

  const handlePlaceBet = useCallback(() => {
    if (canPlaceBet && selectedPrediction) onPlaceBet(selectedPrediction, parsedAmount);
  }, [canPlaceBet, selectedPrediction, parsedAmount, onPlaceBet]);

  const handleRetry = useCallback(() => {
    if (onClearError) onClearError();
    if (selectedPrediction && parsedAmount > 0 && validation.valid) {
      onPlaceBet(selectedPrediction, parsedAmount);
    }
  }, [onClearError, selectedPrediction, parsedAmount, validation.valid, onPlaceBet]);

  const handleDismissError = useCallback(() => {
    if (onClearError) onClearError();
  }, [onClearError]);

  const handleMaxBet = useCallback(() => {
    const maxAllowed = Math.min(balance, maxBet);
    setBetAmount(maxAllowed.toString());
    setTouched(true);
  }, [balance, maxBet]);

  return (
    <div className="glass-card rounded-2xl p-6 shadow-2xl animate-fade-in relative z-10 w-full backdrop-blur-md">
      <div className="mb-6 pb-4 border-b border-white/10">
        <h2 className="text-xl font-bold text-flow-green flex items-center gap-2">Place Your Bet</h2>
        <p className="text-sm text-zinc-400 mt-1">Choose your move and bet amount</p>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-semibold text-zinc-300 mb-3">Your Move</label>
        <div className="grid grid-cols-3 gap-3">
          {OBJECT_TYPES.map(({ type, label, icon, color }) => {
            const isSelected = selectedPrediction === type;
            return (
              <button
                key={type}
                onClick={() => handlePredictionSelect(type)}
                disabled={disabled || isLoading}
                className={`relative group flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${isSelected ? 'bg-white/5 scale-105 z-10' : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-500 hover:bg-zinc-800'} ${(disabled || isLoading) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                style={{
                  borderColor: isSelected ? color : undefined,
                  boxShadow: isSelected ? `0 0 20px ${color}40` : undefined
                }}
              >
                <div
                  className="rounded-full w-12 h-12 flex items-center justify-center transition-transform group-hover:scale-110 duration-200 border-2"
                  style={{
                    backgroundColor: color,
                    borderColor: isSelected ? '#fff' : 'rgba(0,0,0,0.2)'
                  }}
                >
                  <span className="text-2xl filter grayscale brightness-200 drop-shadow-md">{icon}</span>
                </div>

                <span
                  className={`text-xs font-bold uppercase tracking-wider transition-colors`}
                  style={{ color: isSelected ? color : '#a1a1aa' }}
                >
                  {label}
                </span>

                {isSelected && <div className="absolute inset-0 rounded-xl border-2 animate-pulse pointer-events-none" style={{ borderColor: color, opacity: 0.5 }} />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <label htmlFor="bet-amount" className="text-sm font-semibold text-zinc-300">Bet Amount</label>
          <button onClick={handleMaxBet} disabled={disabled || isLoading} className="text-[10px] font-bold text-flow-green bg-flow-green/10 border border-flow-green/50 px-2 py-1 rounded hover:bg-flow-green/20 disabled:opacity-50 transition-colors">MAX</button>
        </div>
        <div className="relative group">
          <input
            id="bet-amount"
            type="text"
            inputMode="decimal"
            value={betAmount}
            onChange={handleAmountChange}
            onBlur={handleAmountBlur}
            disabled={disabled || isLoading}
            placeholder={`Min: ${minBet}`}
            className={`w-full bg-black/40 text-white text-lg font-bold rounded-xl px-4 py-3 pr-16 border-2 outline-none transition-all duration-200 ${validation.errorMessage && touched ? 'border-red-500/50 focus:border-red-500 focus:shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'border-zinc-700 focus:border-flow-green focus:shadow-[0_0_15px_rgba(0,239,139,0.15)] group-hover:border-zinc-600'} disabled:opacity-50`}
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-500 cursor-default">FLOW</span>
        </div>
        <div className="mt-2 h-5 flex items-center justify-between text-xs">
          {validation.errorMessage && touched ? <span className="text-red-400 font-medium animate-slide-up">{validation.errorMessage}</span> : <span className="text-zinc-500">Balance: {balance.toFixed(2)} FLOW</span>}
        </div>
      </div>

      <div className={`bg-gradient-to-r from-flow-green/10 to-transparent border-l-2 border-flow-green p-3 rounded-r-lg mb-6 transform transition-all duration-300 overflow-hidden ${(potentialPayout > 0) ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0 h-0 p-0 mb-0'}`}>
        <div className="flex justify-between items-center">
          <span className="text-xs text-zinc-400 uppercase tracking-widest font-semibold">Potential Win</span>
          <span className="text-xl font-bold text-flow-green drop-shadow-[0_0_8px_rgba(0,239,139,0.5)]">+{potentialPayout.toFixed(2)} FLOW</span>
        </div>
      </div>

      <button
        onClick={handlePlaceBet}
        disabled={!canPlaceBet}
        className={`w-full py-4 rounded-xl font-bold text-lg uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-3 relative overflow-hidden group ${canPlaceBet ? 'bg-flow-green text-black hover:bg-flow-green-hover shadow-[0_4px_20px_rgba(0,239,139,0.3)] hover:shadow-[0_6px_25px_rgba(0,239,139,0.4)] hover:-translate-y-0.5' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-t-zinc-700'}`}
      >
        {isLoading && <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />}
        <span className="relative z-10">{isLoading ? 'Processing...' : 'Place Bet'}</span>
        {canPlaceBet && <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 pointer-events-none" />}
      </button>

      {transactionError && (
        <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 animate-scale-in">
          <div className="flex items-start gap-3">
            <span className="text-xl text-red-500">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
              </svg>
            </span>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-red-400">Transaction Failed</h4>
              <p className="text-xs text-zinc-300 mt-1 mb-3">{transactionError}</p>
              <div className="flex gap-2">
                <button onClick={handleRetry} className="px-3 py-1.5 bg-red-500/20 text-red-300 text-xs font-bold rounded hover:bg-red-500/30 transition-colors">Retry</button>
                {transactionError.includes('already in progress') && onResetGame && (
                  <button onClick={() => { onResetGame(); if (onClearError) onClearError(); }} className="px-3 py-1.5 bg-zinc-800 text-zinc-400 text-xs font-bold rounded hover:bg-zinc-700 transition-colors border border-zinc-600">Reset Game</button>
                )}
                <button onClick={handleDismissError} className="px-3 py-1.5 text-zinc-500 text-xs font-bold hover:text-zinc-300 transition-colors ml-auto">Dismiss</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {disabled && (
        <div className="mt-4 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 text-center">
          <p className="text-xs text-orange-400 font-medium">Connect wallet to start playing</p>
        </div>
      )}
    </div>
  );
}

export default BettingPanel;
