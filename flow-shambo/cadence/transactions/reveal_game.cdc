// reveal_game.cdc
// Transaction to reveal a game in FlowShambo
// Phase 2 of the commit-reveal scheme
// Must be called after at least 1 block has passed since commit

import FlowShambo from 0x9d8d1e6cee0341ec

/// Reveals the game by generating initial object positions from on-chain randomness
/// Returns the GameInitData containing seed and object positions/velocities
///
/// Note: This transaction requires the Receipt to be stored in the player's account
/// The actual implementation depends on how receipts are stored
transaction() {
    
    let receipt: &FlowShambo.Receipt
    
    prepare(signer: auth(BorrowValue) &Account) {
        // Borrow the receipt from storage
        // Note: This assumes a single receipt storage pattern
        // In production, you might have a collection of receipts
        self.receipt = signer.storage.borrow<&FlowShambo.Receipt>(
            from: FlowShambo.ReceiptStoragePath
        ) ?? panic("No receipt found in storage. Did you commit a bet first?")
    }
    
    execute {
        // Reveal the game and get initial positions
        let gameData = FlowShambo.revealGame(receipt: self.receipt)
        
        // Log the game data for the frontend to use
        log("Game revealed with seed: ".concat(gameData.seed.toString()))
        log("Number of objects: ".concat(gameData.objects.length.toString()))
        
        // Log each object's initial state
        for obj in gameData.objects {
            log("Object - Type: ".concat(obj.objectType.toString())
                .concat(", X: ").concat(obj.x.toString())
                .concat(", Y: ").concat(obj.y.toString())
                .concat(", VX: ").concat(obj.vx.toString())
                .concat(", VY: ").concat(obj.vy.toString()))
        }
    }
}
