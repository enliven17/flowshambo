// Script to get FlowShambo contract configuration
import FlowShambo from 0x9d8d1e6cee0341ec

access(all) fun main(): {String: AnyStruct} {
    return {
        "minBet": FlowShambo.getMinBet(),
        "maxBet": FlowShambo.getMaxBet(),
        "payoutMultiplier": FlowShambo.getPayoutMultiplier(),
        "houseBalance": FlowShambo.getHouseBalance(),
        "totalBetsPlaced": FlowShambo.getTotalBetsPlaced(),
        "objectsPerType": FlowShambo.OBJECTS_PER_TYPE,
        "arenaWidth": FlowShambo.ARENA_WIDTH,
        "arenaHeight": FlowShambo.ARENA_HEIGHT
    }
}
