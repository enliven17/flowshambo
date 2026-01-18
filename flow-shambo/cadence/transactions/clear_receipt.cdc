// clear_receipt.cdc
// Emergency transaction to clear a stuck receipt from storage
// Use this if you need to cancel a game in progress

import FlowShambo from 0x9d8d1e6cee0341ec

transaction() {
    
    prepare(signer: auth(LoadValue) &Account) {
        // Try to load and destroy the receipt
        if let receipt <- signer.storage.load<@FlowShambo.Receipt>(
            from: FlowShambo.ReceiptStoragePath
        ) {
            log("Receipt found and removed")
            destroy receipt
        } else {
            log("No receipt found in storage")
        }
    }
    
    execute {
        log("Receipt cleared successfully")
    }
}
