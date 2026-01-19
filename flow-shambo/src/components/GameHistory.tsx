'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase/client';

interface GameRecord {
    id: string;
    created_at: string;
    player_address: string;
    bet_amount: number;
    prediction: string;
    winner: string;
    payout: number;
    transaction_id: string;
}

// Use same emojis as Arena component
const OBJECT_EMOJIS: Record<string, string> = {
    rock: '✊',
    paper: '✋',
    scissors: '✌️',
};

interface WinStats {
    rock: { wins: number; total: number };
    paper: { wins: number; total: number };
    scissors: { wins: number; total: number };
}

function formatTimeAgo(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
}

function truncateAddress(address: string) {
    if (!address) return 'Unknown';
    if (address.length < 10) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

function calculateWinStats(games: GameRecord[]): WinStats {
    const stats: WinStats = {
        rock: { wins: 0, total: 0 },
        paper: { wins: 0, total: 0 },
        scissors: { wins: 0, total: 0 },
    };

    games.forEach((game) => {
        const type = game.winner.toLowerCase() as 'rock' | 'paper' | 'scissors';
        if (stats[type]) {
            stats[type].wins++;
            stats[type].total++;
        }
    });

    return stats;
}

export function GameHistory() {
    const [games, setGames] = useState<GameRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [allGames, setAllGames] = useState<GameRecord[]>([]);

    // Calculate win percentages from all games
    const winStats = useMemo(() => calculateWinStats(allGames), [allGames]);

    const getWinPercentage = (type: 'rock' | 'paper' | 'scissors') => {
        const total = winStats.rock.total + winStats.paper.total + winStats.scissors.total;
        if (total === 0) return 33.3;
        return ((winStats[type].wins / total) * 100).toFixed(1);
    };

    useEffect(() => {
        // Initial fetch
        fetchGames();
        fetchAllGames();

        // Subscribe to new games
        const channel = supabase
            .channel('games_changes')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'games',
                },
                (payload) => {
                    const newGame = payload.new as GameRecord;
                    setGames((prev) => [newGame, ...prev].slice(0, 3));
                    setAllGames((prev) => [newGame, ...prev]);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchGames = async () => {
        try {
            const { data, error } = await supabase
                .from('games')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(3);

            if (error) {
                console.error('Error fetching games:', JSON.stringify(error, null, 2), error.message || error.details || error);
            } else {
                setGames(data || []);
            }
        } catch (err) {
            console.error('Failed to fetch games:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchAllGames = async () => {
        try {
            const { data, error } = await supabase
                .from('games')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100); // Get last 100 games for stats

            if (!error && data) {
                setAllGames(data);
            }
        } catch (err) {
            console.error('Failed to fetch all games:', err);
        }
    };

    return (
        <div className="glass-card rounded-2xl p-6 border-l-4 border-flow-green/50 overflow-hidden">
            <h3 className="text-xl font-bold text-flow-green mb-4 flex items-center gap-2">
                BATTLE HISTORY
            </h3>

            {/* Win Rate Stats */}
            {allGames.length > 0 && (
                <div className="mb-4 grid grid-cols-3 gap-2">
                    {(['rock', 'paper', 'scissors'] as const).map((type) => {
                        const percentage = getWinPercentage(type);
                        return (
                            <div
                                key={type}
                                className="glass rounded-lg p-2 border border-white/5 hover:border-flow-green/30 transition-colors"
                            >
                                <div className="flex items-center justify-center gap-1 mb-1">
                                    <span className="text-lg">{OBJECT_EMOJIS[type]}</span>
                                </div>
                                <div className="text-center">
                                    <div className="text-xs font-bold text-flow-green">{percentage}%</div>
                                    <div className="text-[10px] text-zinc-500 uppercase">{type}</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {isLoading ? (
                <div className="flex justify-center py-8">
                    <div className="w-6 h-6 border-2 border-flow-green border-t-transparent rounded-full animate-spin" />
                </div>
            ) : games.length === 0 ? (
                <div className="text-center py-8 text-zinc-500 text-sm">
                    No battles recorded yet. Be the first!
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="text-xs text-zinc-500 uppercase font-medium border-b border-white/10">
                            <tr>
                                <th className="pb-4 pl-2">Player</th>
                                <th className="pb-4 text-center" title="Prediction">P</th>
                                <th className="pb-4 text-center" title="Winner">W</th>
                                <th className="pb-4" title="Result">R</th>
                                <th className="pb-4 pr-2 text-right">Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {games.map((game) => {
                                const isWin = game.prediction === game.winner;
                                return (
                                    <tr key={game.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="py-4 pl-2 font-mono text-zinc-300">
                                            {truncateAddress(game.player_address)}
                                        </td>
                                        <td className="py-4 text-center">
                                            <span className="text-2xl" title={`Prediction: ${game.prediction}`}>
                                                {OBJECT_EMOJIS[game.prediction.toLowerCase()] || '❓'}
                                            </span>
                                        </td>
                                        <td className="py-4 text-center">
                                            <span className="text-2xl" title={`Winner: ${game.winner}`}>
                                                {OBJECT_EMOJIS[game.winner.toLowerCase()] || '❓'}
                                            </span>
                                        </td>
                                        <td className="py-4">
                                            {isWin ? (
                                                <span className="text-flow-green font-bold flex items-center gap-1">
                                                    WIN <span className="text-xs font-normal opacity-70">+{Number(game.payout).toFixed(2)}</span>
                                                </span>
                                            ) : (
                                                <span className="text-red-400 font-bold opacity-60">LOSS</span>
                                            )}
                                        </td>
                                        <td className="py-4 pr-2 text-right text-xs text-zinc-500 group-hover:text-zinc-300">
                                            {formatTimeAgo(game.created_at)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
