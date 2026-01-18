// commit_bet.cdc
// Transaction to commit a bet in FlowShambo
// Phase 1 of the commit-reveal scheme

import FungibleToken from 0x9a0766d93b6608b7
import FlowToken from 0x7e60df042a9c0868
import FlowShambo from 0x9d8d1e6cee0341ec

/// Commits a bet by escrowing FLOW tokens and receiving a Receipt
/// The Receipt is stored in the player's account for later reveal and settlement
///
/// @param prediction: The player's prediction (0=Rock, 1=Paper, 2=Scissors)
/// @param amount: The amount of FLOW tokens to bet
transaction(prediction: UInt8, amount: UFix64) {
    
    let playerVault: @{FungibleToken.Vault}
    let playerAddress: Address
    let signerRef: auth(SaveValue, LoadValue) &Account
    
    prepare(signer: auth(BorrowValue, SaveValue, LoadValue) &Account) {
        // Get the player's address
        self.playerAddress = signer.address
        self.signerRef = signer
        
        // Check if there's already a receipt in storage
        if signer.storage.type(at: FlowShambo.ReceiptStoragePath) != nil {
            panic("A game is already in progress. Please complete or cancel it first.")
        }
        
        // Borrow the player's FlowToken vault
        let vaultRef = signer.storage.borrow<auth(FungibleToken.Withdraw) &FlowToken.Vault>(
            from: /storage/flowTokenVault
        ) ?? panic("Could not borrow FlowToken vault from storage")
        
        // Withdraw the bet amount
        self.playerVault <- vaultRef.withdraw(amount: amount)
    }
    
    execute {
        // Commit the bet and receive a Receipt
        let receipt <- FlowShambo.commitBet(
            player: self.playerAddress,
            prediction: prediction,
            bet: <-self.playerVault
        )
        
        // Log receipt details
        log("Receipt ID: ".concat(receipt.id.toString()))
        log("Commit Block: ".concat(receipt.commitBlock.toString()))
        log("Prediction: ".concat(receipt.prediction.toString()))
        log("Bet Amount: ".concat(receipt.betAmount.toString()))
        
        // Store the receipt in the player's account for later use
        self.signerRef.storage.save(<-receipt, to: FlowShambo.ReceiptStoragePath)
    }
}
