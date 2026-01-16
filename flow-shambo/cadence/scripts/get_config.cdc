// Script to get FlowShambo contract configuration
import FlowShambo from "../contracts/FlowShambo.cdc"

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
