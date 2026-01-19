'use client';

/**
 * FlowShambo Main Page
 * 
 * The main game interface for FlowShambo - a physics-based rock-paper-scissors
 * betting game on the Flow blockchain.
 * 
 * Modernized UI:
 * - Glassmorphism design
 * - Sticky blurred navbar
 * - Responsive grid layout
 * - Enhanced typography
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
import { useClearReceipt } from '../hooks/useClearReceipt';
import { GameHistory } from '../components/GameHistory';

import { FlickeringGrid } from '../components/FlickeringGrid';
import type { ObjectType, LoadingType } from '../types';

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
  const clearReceipt = useClearReceipt();

  // Local UI state
  const [loadingType, setLoadingType] = useState<LoadingType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);

  // Determine if we're in a loading state
  const isLoading = loadingType !== null || clearReceipt.isClearing;

  // Determine if simulation is running
  const isSimulationRunning = simulation.status === 'running';

  // Handle clear receipt (reset game)
  const handleResetGame = useCallback(async () => {
    if (window.confirm('This will clear any stuck game in progress. Your bet will be lost if you force reset. Continue?')) {
      setLoadingType('settling-game');
      const success = await clearReceipt.clearReceipt();
      if (success) {
        setError(null);
        placeBet.clearError();
        simulation.reset();
        gameStore.resetGame();
      }
      setLoadingType(null);
    }
  }, [clearReceipt, placeBet, simulation, gameStore]);

  // Handle bet placement
  const handlePlaceBet = useCallback(async (prediction: ObjectType, amount: number) => {
    setError(null);
    setLoadingType('placing-bet');

    try {
      const result = await placeBet.placeBet(prediction, amount);

      if (!result) {
        setLoadingType(null);
        return;
      }

      setLoadingType('revealing-game');
      const initData = await revealGame.revealGame();

      if (initData) {
        simulation.start(initData);
        setLoadingType(null);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to place bet';
      setError(msg);
      setLoadingType(null);
    }
  }, [placeBet, revealGame, simulation]);

  // Handle simulation completion
  useEffect(() => {
    console.log('🔍 Simulation check:', {
      status: simulation.status,
      winner: simulation.winner,
      showResult
    });

    const isComplete = simulation.status === 'completed' || simulation.status === 'timeout';
    if (isComplete && simulation.winner && !showResult) {
      console.log('🎯 Simulation complete! Calling settleGame with winner:', simulation.winner);
      
      const settle = async () => {
        setLoadingType('settling-game');
        try {
          console.log('📤 Calling settleGame...');
          const result = await settleGame.settleGame(simulation.winner!);
          console.log('✅ Settlement complete:', result);
          setShowResult(true);
        } catch (err) {
          console.error('❌ Settlement failed:', err);
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

  // Check if error is related to stuck game
  const isStuckError = error && (
    error.includes('already in progress') ||
    error.includes('already been revealed') ||
    error.includes('already been settled')
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative overflow-x-hidden selection:bg-flow-green selection:text-black">

      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <FlickeringGrid
          color="rgb(0, 239, 139)"
          maxOpacity={0.12}
          flickerChance={0.3}
          squareSize={4}
          gridGap={8}
          className="absolute inset-0"
        />
        <div className="absolute inset-0 bg-gradient-dark opacity-80" />
      </div>

      {/* Main Layout Layer */}
      <div className="relative z-10 flex flex-col min-h-screen">

        {/* Sticky Glass Navbar */}
        <header className="sticky top-0 z-50 w-full glass-strong border-b border-white/5">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-12 sm:h-16 flex items-center justify-between">
            <div className="flex items-center gap-1.5 sm:gap-2 group cursor-pointer hover:opacity-80 transition-opacity">
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-flow-green/20 border border-flow-green flex items-center justify-center overflow-hidden p-0.5">
                <img 
                  src="/logo.ico" 
                  alt="FlowShambo" 
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    // Fallback to SVG if image fails to load
                    e.currentTarget.style.display = 'none';
                    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                    svg.setAttribute('viewBox', '0 0 24 24');
                    svg.setAttribute('fill', 'currentColor');
                    svg.setAttribute('class', 'w-3.5 h-3.5 sm:w-5 sm:h-5 text-flow-green');
                    svg.innerHTML = '<path d="M12.378 1.602a.75.75 0 00-.756 0L3 6.632l9 5.25 9-5.25-8.622-5.03zM21.75 7.93l-9 5.25v9l8.628-5.032a.75.75 0 00.372-.648V7.93zM11.25 22.18v-9l-9-5.25v8.57a.75.75 0 00.372.648l8.628 5.033z" />';
                    e.currentTarget.parentElement?.appendChild(svg);
                  }}
                />
              </div>
              <h1 className="text-base sm:text-2xl font-bold tracking-tight text-white group-hover:text-neon transition-all">
                Flow<span className="text-flow-green">Shambo</span>
              </h1>
            </div>

            <WalletButton
              balance={balance}
              onConnect={() => { }}
              onDisconnect={() => { }}
            />
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col lg:flex-row gap-8">

          {/* Left Column: Arena & Game Info */}
          <div className="flex-1 flex flex-col gap-6 min-h-0">

            {/* Header / Info Block */}
            <div className="glass-card rounded-2xl p-6 border-l-4 border-flow-green animate-fade-in">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-flow-green mb-1 flex items-center gap-2">
                    Battle Arena <span className="text-xs bg-flow-green/10 text-flow-green px-2 py-0.5 rounded-full border border-flow-green/30">LIVE</span>
                  </h2>
                </div>
                {/* Status Indicator */}
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-full border border-white/5">
                    <span className={`w-2 h-2 rounded-full ${isSimulationRunning ? 'bg-flow-green animate-pulse' : 'bg-zinc-500'}`} />
                    <span className="text-xs font-mono text-zinc-300">
                      {isSimulationRunning ? 'SIMULATION ACTIVE' : 'WAITING FOR BET'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Arena Display */}
            <div className="flex-1 glass rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative min-h-[300px] sm:min-h-[400px] lg:min-h-[500px] flex flex-col group">
              {/* Arena Glow Effect */}
              <div className="absolute -inset-1 bg-flow-green/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

              <div className="relative z-10 flex-1 flex flex-col w-full h-full bg-black/40">
                <Arena
                  objects={simulation.objects}
                  width={ARENA_WIDTH}
                  height={ARENA_HEIGHT}
                  showCounts={isSimulationRunning || simulation.objects.length > 0}
                  collisionEvents={simulation.collisionEvents}
                  className="w-full h-full"
                />

                {isSimulationRunning && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 glass px-6 py-2 rounded-full border border-flow-green/30 flex items-center gap-3 animate-slide-up">
                    <div className="w-2 h-2 rounded-full bg-flow-green animate-spin" />
                    <span className="text-flow-green font-bold text-sm tracking-wider">
                      SIMULATING MATCH...
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <ErrorDisplay
                error={error}
                onDismiss={handleDismissError}
                showRetry={!!isStuckError}
                onRetry={isStuckError ? handleResetGame : undefined}
              />
            )}
          </div>

          {/* Right Column: Betting & Controls */}
          <div className="lg:w-[400px] flex-shrink-0 flex flex-col gap-6">
            {!isSimulationRunning && !showResult ? (
              <div className="animate-scale-in">
                <BettingPanel
                  onPlaceBet={handlePlaceBet}
                  balance={balance ?? 0}
                  disabled={!wallet.connected}
                  isLoading={isLoading}
                  transactionError={placeBet.error}
                  onClearError={() => placeBet.clearError?.()}
                  onResetGame={handleResetGame}
                />
              </div>
            ) : (
              <div className="glass-card rounded-2xl p-8 text-center border border-flow-green/30 animate-scale-in flex flex-col items-center justify-center min-h-[300px]">
                <div className="w-16 h-16 rounded-full bg-flow-green/20 flex items-center justify-center mb-6 animate-pulse">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-flow-green">
                    <path d="M19.5 6h-15v9h15V6z" />
                    <path fillRule="evenodd" d="M3.375 3C2.339 3 1.5 3.84 1.5 4.875v11.25c0 1.035.84 1.875 1.875 1.875h17.25c1.035 0 1.875-.84 1.875-1.875V4.875C22.5 3.839 21.66 3 20.625 3H3.375zm.75 1.5h15.75c.414 0 .75.336.75.75v9c0 .414-.336.75-.75.75H4.125a.75.75 0 01-.75-.75v-9c0-.414.336-.75.75-.75z" clipRule="evenodd" />
                    <path d="M9.75 10.5a.75.75 0 000-1.5h-1.5v-1.5a.75.75 0 00-1.5 0v1.5h-1.5a.75.75 0 000 1.5h1.5v1.5a.75.75 0 001.5 0v-1.5h1.5zM16.5 10.5a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 10.5a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-flow-green mb-2">Game in Progress</h3>
                <p className="text-zinc-400 mb-6">
                  Watch the arena! Your bet is placed on <span className="text-white font-bold uppercase">{gameStore.game.prediction}</span>
                </p>
                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-flow-green w-1/2 animate-[shimmer_2s_infinite_linear]" />
                </div>
              </div>
            )}
            <GameHistory />
          </div>

        </main>

        {/* Footer */}
        <footer className="mt-auto py-8 border-t border-white/5 glass-strong">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <p className="text-sm text-zinc-500">
              Built on <a href="https://flow.com" target="_blank" rel="noopener noreferrer" className="text-flow-green hover:text-white transition-colors font-medium">Flow blockchain</a> • Testnet Only
            </p>
          </div>
        </footer>
      </div>

      {/* Global Overlays */}
      <LoadingOverlay
        isVisible={isLoading}
        loadingType={loadingType}
        onCancel={() => {
          if (confirm('Force stop loading? This will just clear the spinner.')) {
            setLoadingType(null);
          }
        }}
      />

      {showResult && simulation.winner && (
        <ResultOverlay
          winner={simulation.winner}
          playerWon={simulation.winner === gameStore.game.prediction}
          payout={simulation.winner === gameStore.game.prediction ? (gameStore.game.betAmount ?? 0) * 2.5 : 0}
          onPlayAgain={handlePlayAgain}
          isVisible={showResult}
          betTxId={gameStore.game.betTransactionId}
          revealTxId={gameStore.game.revealTransactionId}
          settleTxId={gameStore.game.settleTransactionId}
          betAmount={gameStore.game.betAmount ?? 0}
        />
      )}
    </div>
  );
}

