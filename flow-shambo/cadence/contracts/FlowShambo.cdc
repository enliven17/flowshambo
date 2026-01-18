// FlowShambo.cdc
// A physics-based rock-paper-scissors betting game on Flow blockchain
// Uses commit-reveal scheme with on-chain randomness for verifiable fairness

import "FungibleToken"
import "FlowToken"
import "RandomBeaconHistory"

access(all) contract FlowShambo {

    // ============================================================
    // Events
    // ============================================================
    
    /// Emitted when a player commits a bet
    access(all) event BetCommitted(
        receiptId: UInt64,
        player: Address,
        prediction: UInt8,
        amount: UFix64,
        commitBlock: UInt64
    )
    
    /// Emitted when a game is revealed with initial positions
    access(all) event GameRevealed(
        receiptId: UInt64,
        seed: UInt256,
        objectCount: UInt8
    )
    
    /// Emitted when a game is settled
    access(all) event GameSettled(
        receiptId: UInt64,
        winningType: UInt8,
        playerWon: Bool,
        payout: UFix64
    )

    // ============================================================
    // Object Type Constants
    // ============================================================
    
    /// Rock type identifier
    access(all) let ROCK: UInt8
    
    /// Paper type identifier
    access(all) let PAPER: UInt8
    
    /// Scissors type identifier
    access(all) let SCISSORS: UInt8

    // ============================================================
    // Game Configuration Constants
    // ============================================================
    
    /// Number of objects per type in the arena
    access(all) let OBJECTS_PER_TYPE: UInt8
    
    /// Arena width in pixels
    access(all) let ARENA_WIDTH: UFix64
    
    /// Arena height in pixels
    access(all) let ARENA_HEIGHT: UFix64
    
    /// Minimum bet amount in FLOW
    access(all) let MIN_BET: UFix64
    
    /// Maximum bet amount in FLOW
    access(all) let MAX_BET: UFix64
    
    /// Payout multiplier for winning bets (e.g., 2.5x)
    access(all) let PAYOUT_MULTIPLIER: UFix64

    // ============================================================
    // Storage Paths
    // ============================================================
    
    /// Storage path for player receipts
    access(all) let ReceiptStoragePath: StoragePath
    
    /// Storage path for admin resource
    access(all) let AdminStoragePath: StoragePath

    // ============================================================
    // Contract State
    // ============================================================
    
    /// Total number of bets placed across all games
    access(all) var totalBetsPlaced: UInt64
    
    /// House vault holding escrowed FLOW tokens
    access(contract) var houseBalance: @{FungibleToken.Vault}

    // ============================================================
    // Game Initialization Structs
    // ============================================================
    
    /// Object radius for collision detection and spawn positioning
    access(all) let OBJECT_RADIUS: UFix64
    
    /// Minimum velocity magnitude for objects
    access(all) let MIN_VELOCITY: UFix64
    
    /// Maximum velocity magnitude for objects
    access(all) let MAX_VELOCITY: UFix64
    
    /// Initial object data for a single game object
    access(all) struct ObjectInit {
        /// Object type (0=Rock, 1=Paper, 2=Scissors)
        access(all) let objectType: UInt8
        
        /// X position in arena
        access(all) let x: UFix64
        
        /// Y position in arena
        access(all) let y: UFix64
        
        /// X velocity (can be negative, stored as Fix64)
        access(all) let vx: Fix64
        
        /// Y velocity (can be negative, stored as Fix64)
        access(all) let vy: Fix64
        
        init(objectType: UInt8, x: UFix64, y: UFix64, vx: Fix64, vy: Fix64) {
            self.objectType = objectType
            self.x = x
            self.y = y
            self.vx = vx
            self.vy = vy
        }
    }
    
    /// Game initialization data returned after reveal
    access(all) struct GameInitData {
        /// Random seed used for generation (for verification)
        access(all) let seed: UInt256
        
        /// Array of initial object states
        access(all) let objects: [ObjectInit]
        
        init(seed: UInt256, objects: [ObjectInit]) {
            self.seed = seed
            self.objects = objects
        }
    }

    // ============================================================
    // Receipt Resource
    // ============================================================
    
    /// Receipt resource for commit-reveal pattern
    /// Created when a player commits a bet, destroyed after settlement
    access(all) resource Receipt {
        /// Unique identifier for this receipt
        access(all) let id: UInt64
        
        /// Address of the player who placed the bet
        access(all) let player: Address
        
        /// Player's prediction (0=Rock, 1=Paper, 2=Scissors)
        access(all) let prediction: UInt8
        
        /// Amount of FLOW tokens bet
        access(all) let betAmount: UFix64
        
        /// Block height at which the bet was committed
        access(all) let commitBlock: UInt64
        
        /// Whether the game has been revealed (positions generated)
        access(all) var revealed: Bool
        
        /// Whether the game has been settled (payout distributed)
        access(all) var settled: Bool
        
        /// Random seed used for position generation (set after reveal)
        access(all) var seed: UInt256?

        init(
            id: UInt64,
            player: Address,
            prediction: UInt8,
            betAmount: UFix64,
            commitBlock: UInt64
        ) {
            self.id = id
            self.player = player
            self.prediction = prediction
            self.betAmount = betAmount
            self.commitBlock = commitBlock
            self.revealed = false
            self.settled = false
            self.seed = nil
        }
        
        /// Mark the receipt as revealed and store the seed
        access(contract) fun markRevealed(seed: UInt256) {
            self.revealed = true
            self.seed = seed
        }
        
        /// Mark the receipt as settled
        access(contract) fun markSettled() {
            self.settled = true
        }
    }

    // ============================================================
    // Public Functions
    // ============================================================
    
    /// Commit a bet (Phase 1 of commit-reveal)
    /// Validates the bet, escrows tokens, and returns a Receipt
    /// 
    /// @param player: The address of the player placing the bet (from transaction signer)
    /// @param prediction: The player's prediction (0=Rock, 1=Paper, 2=Scissors)
    /// @param bet: The FLOW tokens to bet (will be escrowed)
    /// @return Receipt resource that must be used for reveal and settlement
    access(all) fun commitBet(
        player: Address,
        prediction: UInt8,
        bet: @{FungibleToken.Vault}
    ): @Receipt {
        // Validate prediction is a valid object type (0, 1, or 2)
        pre {
            prediction == self.ROCK || prediction == self.PAPER || prediction == self.SCISSORS:
                "Invalid prediction: must be 0 (Rock), 1 (Paper), or 2 (Scissors)"
        }
        
        // Get the bet amount before moving the vault
        let betAmount = bet.balance
        
        // Validate bet amount is within allowed range
        assert(
            betAmount >= self.MIN_BET,
            message: "Bet amount is below minimum: ".concat(self.MIN_BET.toString())
        )
        assert(
            betAmount <= self.MAX_BET,
            message: "Bet amount exceeds maximum: ".concat(self.MAX_BET.toString())
        )
        
        // Escrow the bet tokens to the house vault
        self.houseBalance.deposit(from: <-bet)
        
        // Increment total bets counter and use it as receipt ID
        self.totalBetsPlaced = self.totalBetsPlaced + 1
        let receiptId = self.totalBetsPlaced
        
        // Get the current block height for commit-reveal timing
        let commitBlock = getCurrentBlock().height
        
        // Create the receipt resource
        let receipt <- create Receipt(
            id: receiptId,
            player: player,
            prediction: prediction,
            betAmount: betAmount,
            commitBlock: commitBlock
        )
        
        // Emit the BetCommitted event
        emit BetCommitted(
            receiptId: receiptId,
            player: player,
            prediction: prediction,
            amount: betAmount,
            commitBlock: commitBlock
        )
        
        return <-receipt
    }
    
    /// Reveal game and get initial positions (Phase 2 of commit-reveal)
    /// Uses on-chain randomness to generate deterministic object positions
    /// 
    /// @param receipt: Reference to the player's receipt
    /// @return GameInitData containing seed and initial object states
    access(all) fun revealGame(receipt: &Receipt): GameInitData {
        // Validate receipt has not already been revealed
        assert(
            !receipt.revealed,
            message: "Game has already been revealed"
        )
        
        // Validate we're past the commit block (must wait at least 1 block)
        let currentBlock = getCurrentBlock().height
        assert(
            currentBlock > receipt.commitBlock,
            message: "Must wait for next block to reveal. Current: "
                .concat(currentBlock.toString())
                .concat(", Commit: ")
                .concat(receipt.commitBlock.toString())
        )
        
        // Get the random source from RandomBeaconHistory
        // The source of randomness is derived from the commit block
        let randomSource = RandomBeaconHistory.sourceOfRandomness(atBlockHeight: receipt.commitBlock)
        
        // Generate seed from the random source combined with receipt ID for uniqueness
        let seed = self.generateSeed(source: randomSource.value, receiptId: receipt.id)
        
        // Generate all objects deterministically from the seed
        let objects = self.generateObjects(seed: seed)
        
        // Mark receipt as revealed with the seed
        // Note: We need to use the contract-level function to modify the receipt
        self.markReceiptRevealed(receiptId: receipt.id, seed: seed, receipt: receipt)
        
        // Emit GameRevealed event
        emit GameRevealed(
            receiptId: receipt.id,
            seed: seed,
            objectCount: UInt8(objects.length)
        )
        
        return GameInitData(seed: seed, objects: objects)
    }
    
    /// Generate a seed from the random source and receipt ID
    access(self) fun generateSeed(source: [UInt8], receiptId: UInt64): UInt256 {
        // Combine source bytes with receipt ID to create unique seed
        // Take first 32 bytes of source and XOR with receipt ID
        var seed: UInt256 = 0
        var i = 0
        while i < 32 && i < source.length {
            seed = seed << 8
            seed = seed | UInt256(source[i])
            i = i + 1
        }
        // XOR with receipt ID for additional uniqueness
        seed = seed ^ UInt256(receiptId)
        return seed
    }
    
    /// Generate all game objects deterministically from seed
    access(self) fun generateObjects(seed: UInt256): [ObjectInit] {
        var objects: [ObjectInit] = []
        var currentSeed = seed
        
        // Total objects = OBJECTS_PER_TYPE * 3 (Rock, Paper, Scissors)
        let totalObjects = UInt8(self.OBJECTS_PER_TYPE) * 3
        
        // Track positions to avoid overlaps
        var positions: [[UFix64]] = []
        
        // Generate objects for each type
        var objectType: UInt8 = 0
        while objectType < 3 {
            var count: UInt8 = 0
            while count < self.OBJECTS_PER_TYPE {
                // Generate position with collision avoidance
                var x: UFix64 = 0.0
                var y: UFix64 = 0.0
                var validPosition = false
                var attempts = 0
                
                while !validPosition && attempts < 100 {
                    // Generate X position within bounds (with radius padding)
                    currentSeed = self.nextRandom(currentSeed)
                    x = self.randomInRange(
                        seed: currentSeed,
                        min: self.OBJECT_RADIUS,
                        max: self.ARENA_WIDTH - self.OBJECT_RADIUS
                    )
                    
                    // Generate Y position within bounds (with radius padding)
                    currentSeed = self.nextRandom(currentSeed)
                    y = self.randomInRange(
                        seed: currentSeed,
                        min: self.OBJECT_RADIUS,
                        max: self.ARENA_HEIGHT - self.OBJECT_RADIUS
                    )
                    
                    // Check for overlaps with existing positions
                    validPosition = true
                    for pos in positions {
                        let dx = self.absDiff(x, pos[0])
                        let dy = self.absDiff(y, pos[1])
                        // Use squared distance to avoid sqrt
                        let distSquared = dx * dx + dy * dy
                        let minDist = self.OBJECT_RADIUS * 2.0
                        let minDistSquared = minDist * minDist
                        if distSquared < minDistSquared {
                            validPosition = false
                            break
                        }
                    }
                    attempts = attempts + 1
                }
                
                // Store position
                positions.append([x, y])
                
                // Generate velocities
                currentSeed = self.nextRandom(currentSeed)
                let vx = self.randomVelocity(seed: currentSeed)
                
                currentSeed = self.nextRandom(currentSeed)
                let vy = self.randomVelocity(seed: currentSeed)
                
                // Create object
                let obj = ObjectInit(
                    objectType: objectType,
                    x: x,
                    y: y,
                    vx: vx,
                    vy: vy
                )
                objects.append(obj)
                
                count = count + 1
            }
            objectType = objectType + 1
        }
        
        return objects
    }
    
    /// Simple PRNG: Linear Congruential Generator
    /// Uses modular arithmetic to avoid overflow issues
    access(self) fun nextRandom(_ seed: UInt256): UInt256 {
        // LCG parameters - using very small values to prevent overflow
        // Since UInt256 multiplication can overflow, we use modulo first
        let m: UInt256 = 2147483647  // 2^31 - 1 (Mersenne prime)
        let a: UInt256 = 48271       // Small multiplier
        let c: UInt256 = 0           // No increment needed
        
        // Apply modular arithmetic: (a * seed) % m
        // First reduce seed to prevent overflow
        let reducedSeed = seed % m
        return (a * reducedSeed + c) % m
    }
    
    /// Generate a random UFix64 in range [min, max]
    access(self) fun randomInRange(seed: UInt256, min: UFix64, max: UFix64): UFix64 {
        // Use top bits of seed for better randomness
        let range = max - min
        // Convert seed to a fraction [0, 1)
        let fraction = UFix64(seed % 1000000) / 1000000.0
        return min + (range * fraction)
    }
    
    /// Generate a random velocity (can be negative)
    access(self) fun randomVelocity(seed: UInt256): Fix64 {
        // Generate magnitude in range [MIN_VELOCITY, MAX_VELOCITY]
        let magnitude = self.randomInRange(
            seed: seed,
            min: self.MIN_VELOCITY,
            max: self.MAX_VELOCITY
        )
        
        // Determine sign based on seed bit
        let isNegative = (seed % 2) == 1
        
        if isNegative {
            return Fix64(magnitude) * -1.0
        } else {
            return Fix64(magnitude)
        }
    }
    
    /// Calculate absolute difference between two UFix64 values
    access(self) fun absDiff(_ a: UFix64, _ b: UFix64): UFix64 {
        if a > b {
            return a - b
        }
        return b - a
    }
    
    /// Mark a receipt as revealed (internal helper)
    access(self) fun markReceiptRevealed(receiptId: UInt64, seed: UInt256, receipt: &Receipt) {
        // Use the contract-level access to modify the receipt
        receipt.markRevealed(seed: seed)
    }
    
    /// Get the minimum bet amount
    access(all) view fun getMinBet(): UFix64 {
        return self.MIN_BET
    }
    
    /// Get the maximum bet amount
    access(all) view fun getMaxBet(): UFix64 {
        return self.MAX_BET
    }
    
    /// Get the payout multiplier
    access(all) view fun getPayoutMultiplier(): UFix64 {
        return self.PAYOUT_MULTIPLIER
    }
    
    /// Get the current house balance
    access(all) view fun getHouseBalance(): UFix64 {
        return self.houseBalance.balance
    }
    
    /// Get the total number of bets placed
    access(all) view fun getTotalBetsPlaced(): UInt64 {
        return self.totalBetsPlaced
    }
    
    /// Settle the game after simulation (Phase 3 of commit-reveal)
    /// Compares winning type to prediction, calculates payout, and destroys receipt
    /// 
    /// @param receipt: The player's receipt resource (will be destroyed)
    /// @param winningType: The winning object type from simulation (0=Rock, 1=Paper, 2=Scissors)
    /// @return FlowToken.Vault containing the payout (may be empty if player lost)
    access(all) fun settleGame(
        receipt: @Receipt,
        winningType: UInt8
    ): @{FungibleToken.Vault} {
        // Validate receipt has been revealed
        assert(
            receipt.revealed,
            message: "Game must be revealed before settlement"
        )
        
        // Validate receipt has not already been settled
        assert(
            !receipt.settled,
            message: "Game has already been settled"
        )
        
        // Validate winningType is a valid object type (0, 1, or 2)
        assert(
            winningType == self.ROCK || winningType == self.PAPER || winningType == self.SCISSORS,
            message: "Invalid winning type: must be 0 (Rock), 1 (Paper), or 2 (Scissors)"
        )
        
        // Compare winning type to player's prediction
        let playerWon = (winningType == receipt.prediction)
        
        // Calculate payout
        var payout: UFix64 = 0.0
        if playerWon {
            // Player wins: payout = betAmount * PAYOUT_MULTIPLIER
            payout = receipt.betAmount * self.PAYOUT_MULTIPLIER
        }
        // If player loses, payout remains 0.0 (bet is forfeited to house)
        
        // Store receipt data before destruction for event emission
        let receiptId = receipt.id
        let betAmount = receipt.betAmount
        
        // Mark receipt as settled
        receipt.markSettled()
        
        // Withdraw payout from house vault (if any)
        let payoutVault <- self.houseBalance.withdraw(amount: payout)
        
        // Emit GameSettled event
        emit GameSettled(
            receiptId: receiptId,
            winningType: winningType,
            playerWon: playerWon,
            payout: payout
        )
        
        // Destroy the receipt resource
        destroy receipt
        
        // Return the payout vault (may be empty if player lost)
        return <-payoutVault
    }

    // ============================================================
    // Contract Initialization
    // ============================================================
    
    init() {
        // Initialize object type constants
        self.ROCK = 0
        self.PAPER = 1
        self.SCISSORS = 2
        
        // Initialize game configuration
        self.OBJECTS_PER_TYPE = 5
        self.ARENA_WIDTH = 800.0
        self.ARENA_HEIGHT = 600.0
        self.MIN_BET = 0.1
        self.MAX_BET = 100.0
        self.PAYOUT_MULTIPLIER = 2.5
        
        // Initialize physics constants
        self.OBJECT_RADIUS = 20.0
        self.MIN_VELOCITY = 50.0
        self.MAX_VELOCITY = 150.0
        
        // Initialize storage paths
        self.ReceiptStoragePath = /storage/FlowShamboReceipt
        self.AdminStoragePath = /storage/FlowShamboAdmin
        
        // Initialize contract state
        self.totalBetsPlaced = 0
        
        // Initialize house vault with empty FlowToken vault
        self.houseBalance <- FlowToken.createEmptyVault(vaultType: Type<@FlowToken.Vault>())
    }
}
