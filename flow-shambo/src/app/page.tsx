'use client';

/**
 * FlowShambo Main Page
 * 
 * The main game interface for FlowShambo - a physics-based rock-paper-scissors
 * betting game on the Flow blockchain.
 * 
 * Layout:
 * - Header with logo and wallet connection
 * - Main content area with Arena and BettingPanel
 * - Overlays for loading states and results
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.8
 */

import { useState, useCallback, useEffect } from 'react';
import { WalletButton } from '../components/WalletButton';
import { BettingPanel } from '../components/BettingPanel';
import { Arena } from '../components/Arena';
import { ResultOverlay } from '../components/ResultOverlay';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { ErrorDisplay } from '../components/ErrorDisplay';
import { useWallet } from '../hooks/useWallet';
import { useBalance } from '../hooks/useBalance';
import { useGameStore } from '../stores/gameStore';
import { usePlaceBet } from '../hooks/usePlaceBet';
import { useRevealGame } from '../hooks/useRevealGame';
import { useSettleGame } from '../hooks/useSettleGame';
import { useSimulation } from '../hooks/useSimulation';
import type { ObjectType, LoadingType } from '../types';

/**
 * Flow green color constant
 */
const FLOW_GREEN = '#00EF8B';

/**
 * Arena dimensions
 */
const ARENA_WIDTH = 800;
const ARENA_HEIGHT = 500;

export default function Home() {
  const wallet = useWallet();
  const { balance } = useBalance(wallet.address);
  const gameStore = useGameStore();
  
  // Hooks for game flow
  const placeBet = usePlaceBet();
  const revealGame = useRevealGame();
  const settleGame = useSettleGame();
  const simulation = useSimulation();
  
  // Local UI state
  const [loadingType, setLoadingType] = useState<LoadingType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);

  // Determine if we're in a loading state
  const isLoading = loadingType !== null;
  
  // Determine if simulation is running
  const isSimulationRunning = simulation.status === 'running';

  // Handle bet placement
  const handlePlaceBet = useCallback(async (prediction: ObjectType, amount: number) => {
    setError(null);
    setLoadingType('placing-bet');
    
    try {
      await placeBet.placeBet(prediction, amount);
      
      // After bet is placed, reveal the game
      setLoadingType('revealing-game');
      const initData = await revealGame.revealGame();
      
      if (initData) {
        // Start simulation with the revealed objects
        simulation.start(initData);
        setLoadingType(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to place bet');
      setLoadingType(null);
    }
  }, [placeBet, revealGame, simulation]);

  // Handle simulation completion
  useEffect(() => {
    const isComplete = simulation.status === 'completed' || simulation.status === 'timeout';
    if (isComplete && simulation.winner && !showResult) {
      // Settle the game
      const settle = async () => {
        setLoadingType('settling-game');
        try {
          await settleGame.settleGame(simulation.winner!);
          setShowResult(true);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to settle game');
        } finally {
          setLoadingType(null);
        }
      };
      settle();
    }
  }, [simulation.status, simulation.winner, settleGame, showResult]);

  // Handle play again
  const handlePlayAgain = useCallback(() => {
    setShowResult(false);
    simulation.reset();
    gameStore.resetGame();
  }, [simulation, gameStore]);

  // Handle error dismiss
  const handleDismissError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <div
      className="flow-shambo-app"
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--background)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 24px',
          borderBottom: '1px solid var(--border-default)',
          backgroundColor: 'var(--background-surface)',
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <span
            style={{
              fontSize: '32px',
            }}
            role="img"
            aria-label="Rock Paper Scissors"
          >
            🪨📄✂️
          </span>
          <h1
            style={{
              fontSize: '24px',
              fontWeight: '700',
              color: FLOW_GREEN,
              margin: 0,
            }}
          >
            FlowShambo
          </h1>
        </div>

        {/* Wallet Connection */}
        <WalletButton
          balance={balance}
          onConnect={() => {}}
          onDisconnect={() => {}}
        />
      </header>

      {/* Main Content */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '32px 24px',
          gap: '32px',
        }}
      >
        {/* Game Description */}
        <div
          style={{
            textAlign: 'center',
            maxWidth: '600px',
          }}
        >
          <h2
            style={{
              fontSize: '20px',
              fontWeight: '600',
              color: 'var(--foreground)',
              marginBottom: '8px',
            }}
          >
            Predict the Last One Standing
          </h2>
          <p
            style={{
              fontSize: '14px',
              color: 'var(--foreground-secondary)',
              margin: 0,
            }}
          >
            Watch Rock, Paper, and Scissors battle it out in a physics simulation.
            Bet on which type will be the last one remaining!
          </p>
        </div>

        {/* Game Area */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '24px',
            width: '100%',
            maxWidth: '900px',
          }}
        >
          {/* Arena */}
          <Arena
            objects={simulation.objects}
            width={ARENA_WIDTH}
            height={ARENA_HEIGHT}
            showCounts={isSimulationRunning || simulation.objects.length > 0}
            collisionEvents={simulation.collisionEvents}
          />

          {/* Betting Panel - Only show when not simulating */}
          {!isSimulationRunning && !showResult && (
            <BettingPanel
              onPlaceBet={handlePlaceBet}
              balance={balance ?? 0}
              disabled={!wallet.connected}
              isLoading={isLoading}
              transactionError={placeBet.error}
              onClearError={() => placeBet.clearError?.()}
            />
          )}

          {/* Simulation Status */}
          {isSimulationRunning && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                padding: '16px 24px',
                backgroundColor: 'var(--background-surface)',
                borderRadius: '8px',
                border: `1px solid ${FLOW_GREEN}`,
              }}
            >
              <span
                style={{
                  color: FLOW_GREEN,
                  fontSize: '16px',
                  fontWeight: '600',
                }}
              >
                Simulation Running...
              </span>
              <span
                style={{
                  color: 'var(--foreground-secondary)',
                  fontSize: '14px',
                }}
              >
                Your prediction: {gameStore.game.prediction?.toUpperCase() ?? 'None'}
              </span>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <ErrorDisplay
            error={error}
            onDismiss={handleDismissError}
            showRetry={false}
          />
        )}
      </main>

      {/* Footer */}
      <footer
        style={{
          textAlign: 'center',
          padding: '16px 24px',
          borderTop: '1px solid var(--border-default)',
          backgroundColor: 'var(--background-surface)',
        }}
      >
        <p
          style={{
            fontSize: '12px',
            color: 'var(--foreground-muted)',
            margin: 0,
          }}
        >
          Built on{' '}
          <a
            href="https://flow.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: FLOW_GREEN,
              textDecoration: 'none',
            }}
          >
            Flow Blockchain
          </a>
          {' '}• Testnet Only
        </p>
      </footer>

      {/* Loading Overlay */}
      <LoadingOverlay
        isVisible={isLoading}
        loadingType={loadingType}
      />

      {/* Result Overlay */}
      {showResult && simulation.winner && (
        <ResultOverlay
          winner={simulation.winner}
          playerWon={gameStore.game.playerWon ?? false}
          payout={gameStore.game.playerWon ? (gameStore.game.betAmount ?? 0) * 2.5 : 0}
          onPlayAgain={handlePlayAgain}
          isVisible={showResult}
        />
      )}
    </div>
  );
}
