// get_game_config.cdc
// Script to get the FlowShambo game configuration

import "FlowShambo"

/// Returns the game configuration including bet limits and payout multiplier
/// This is useful for the frontend to display betting constraints
///
/// Returns a struct with:
/// - minBet: Minimum bet amount in FLOW
/// - maxBet: Maximum bet amount in FLOW
/// - payoutMultiplier: Multiplier for winning bets (e.g., 2.5x)
/// - objectsPerType: Number of objects per type in the arena
/// - arenaWidth: Arena width in pixels
/// - arenaHeight: Arena height in pixels
/// - objectRadius: Radius of each object for collision detection
access(all) struct GameConfig {
    access(all) let minBet: UFix64
    access(all) let maxBet: UFix64
    access(all) let payoutMultiplier: UFix64
    access(all) let objectsPerType: UInt8
    access(all) let arenaWidth: UFix64
    access(all) let arenaHeight: UFix64
    access(all) let objectRadius: UFix64
    
    init(
        minBet: UFix64,
        maxBet: UFix64,
        payoutMultiplier: UFix64,
        objectsPerType: UInt8,
        arenaWidth: UFix64,
        arenaHeight: UFix64,
        objectRadius: UFix64
    ) {
        self.minBet = minBet
        self.maxBet = maxBet
        self.payoutMultiplier = payoutMultiplier
        self.objectsPerType = objectsPerType
        self.arenaWidth = arenaWidth
        self.arenaHeight = arenaHeight
        self.objectRadius = objectRadius
    }
}

access(all) fun main(): GameConfig {
    return GameConfig(
        minBet: FlowShambo.getMinBet(),
        maxBet: FlowShambo.getMaxBet(),
        payoutMultiplier: FlowShambo.getPayoutMultiplier(),
        objectsPerType: FlowShambo.OBJECTS_PER_TYPE,
        arenaWidth: FlowShambo.ARENA_WIDTH,
        arenaHeight: FlowShambo.ARENA_HEIGHT,
        objectRadius: FlowShambo.OBJECT_RADIUS
    )
}
