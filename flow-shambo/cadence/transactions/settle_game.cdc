// settle_game.cdc
// Transaction to settle a game in FlowShambo
// Phase 3 of the commit-reveal scheme
// Called after the physics simulation determines a winner

import "FungibleToken"
import "FlowToken"
import "FlowShambo"

/// Settles the game by comparing the winning type to the player's prediction
/// If the player won, they receive betAmount * PAYOUT_MULTIPLIER
/// If the player lost, the bet is forfeited to the house
///
/// @param winningType: The winning object type from simulation (0=Rock, 1=Paper, 2=Scissors)
transaction(winningType: UInt8) {
    
    let receipt: @FlowShambo.Receipt
    let playerVaultRef: &{FungibleToken.Receiver}
    
    prepare(signer: auth(LoadValue, BorrowValue) &Account) {
        // Load the receipt from storage (this removes it)
        self.receipt <- signer.storage.load<@FlowShambo.Receipt>(
            from: FlowShambo.ReceiptStoragePath
        ) ?? panic("No receipt found in storage. Did you commit and reveal first?")
        
        // Get reference to player's FlowToken vault to receive payout
        self.playerVaultRef = signer.storage.borrow<&{FungibleToken.Receiver}>(
            from: /storage/flowTokenVault
        ) ?? panic("Could not borrow FlowToken vault receiver")
    }
    
    execute {
        // Settle the game and receive payout
        let payout <- FlowShambo.settleGame(
            receipt: <-self.receipt,
            winningType: winningType
        )
        
        // Log the payout amount
        log("Payout received: ".concat(payout.balance.toString()))
        
        // Deposit payout to player's vault (may be 0 if player lost)
        self.playerVaultRef.deposit(from: <-payout)
    }
}
