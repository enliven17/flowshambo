// get_house_balance.cdc
// Script to get the FlowShambo house balance and statistics

import FlowShambo from 0x9d8d1e6cee0341ec

/// Returns the house statistics including balance and total bets
/// This is useful for monitoring the contract state
///
/// Returns a struct with:
/// - houseBalance: Current FLOW balance in the house vault
/// - totalBetsPlaced: Total number of bets placed since contract deployment
access(all) struct HouseStats {
    access(all) let houseBalance: UFix64
    access(all) let totalBetsPlaced: UInt64
    
    init(houseBalance: UFix64, totalBetsPlaced: UInt64) {
        self.houseBalance = houseBalance
        self.totalBetsPlaced = totalBetsPlaced
    }
}

access(all) fun main(): HouseStats {
    return HouseStats(
        houseBalance: FlowShambo.getHouseBalance(),
        totalBetsPlaced: FlowShambo.getTotalBetsPlaced()
    )
}
