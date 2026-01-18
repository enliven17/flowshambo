# FlowShambo Deployment Guide

This guide explains how to deploy the FlowShambo smart contract to Flow testnet.

## Prerequisites

1. **Flow CLI**: Install the Flow CLI
   ```bash
   sh -ci "$(curl -fsSL https://raw.githubusercontent.com/onflow/flow-cli/master/install.sh)"
   ```

2. **Testnet Account**: You need a Flow testnet account with FLOW tokens
   - Create one at [Flow Faucet](https://testnet-faucet.onflow.org/)
   - Or use the Flow CLI: `flow accounts create --network testnet`

## Project Structure

```
flow-shambo/
├── cadence/
│   ├── contracts/
│   │   └── FlowShambo.cdc          # Main contract
│   ├── scripts/
│   │   ├── get_game_config.cdc     # Query game configuration
│   │   └── get_house_balance.cdc   # Query house balance
│   └── transactions/
│       ├── commit_bet.cdc          # Phase 1: Commit a bet
│       ├── reveal_game.cdc         # Phase 2: Reveal game positions
│       └── settle_game.cdc         # Phase 3: Settle the game
├── flow.json                        # Flow configuration
└── DEPLOYMENT.md                    # This file
```

## Configuration

### 1. Set Up Your Testnet Account

Create a private key file for your testnet account:

```bash
# Generate a new key pair (if you don't have one)
flow keys generate --output testnet-account.pkey

# Or save your existing private key to testnet-account.pkey
echo "YOUR_PRIVATE_KEY_HEX" > testnet-account.pkey
```

### 2. Update flow.json

Replace the placeholder values in `flow.json`:

```json
{
  "accounts": {
    "testnet-account": {
      "address": "YOUR_TESTNET_ADDRESS",  // e.g., "0x1234567890abcdef"
      "key": {
        "type": "file",
        "location": "./testnet-account.pkey"
      }
    }
  }
}
```

Or set environment variables:
```bash
export FLOW_TESTNET_ADDRESS="0x1234567890abcdef"
```

## Deployment Steps

### Step 1: Verify Contract Compiles

```bash
cd flow-shambo
flow cadence check ./cadence/contracts/FlowShambo.cdc
```

### Step 2: Test on Emulator (Optional but Recommended)

```bash
# Start the emulator in a separate terminal
flow emulator

# Deploy to emulator
flow project deploy --network emulator

# Run a test script
flow scripts execute ./cadence/scripts/get_game_config.cdc --network emulator
```

### Step 3: Deploy to Testnet

```bash
# Deploy the contract
flow project deploy --network testnet

# Verify deployment
flow scripts execute ./cadence/scripts/get_game_config.cdc --network testnet
```

## Post-Deployment

### Verify Contract on Testnet Explorer

After deployment, verify your contract at:
- https://testnet.flowscan.io/account/YOUR_CONTRACT_ADDRESS

### Update Frontend Configuration

Update your frontend's Flow configuration with the deployed contract address:

```typescript
// src/config/flow.ts
export const flowConfig = {
  contracts: {
    FlowShambo: '0xYOUR_DEPLOYED_ADDRESS'
  }
};
```

## Using the Contract

### Query Game Configuration

```bash
flow scripts execute ./cadence/scripts/get_game_config.cdc --network testnet
```

Expected output:
```
Result: {
  "minBet": "0.10000000",
  "maxBet": "100.00000000",
  "payoutMultiplier": "2.50000000",
  "objectsPerType": 5,
  "arenaWidth": "800.00000000",
  "arenaHeight": "600.00000000",
  "objectRadius": "20.00000000"
}
```

### Query House Balance

```bash
flow scripts execute ./cadence/scripts/get_house_balance.cdc --network testnet
```

### Place a Bet (Commit Phase)

```bash
# Prediction: 0=Rock, 1=Paper, 2=Scissors
# Amount: FLOW tokens to bet
flow transactions send ./cadence/transactions/commit_bet.cdc 0 1.0 --network testnet --signer testnet-account
```

### Reveal Game

```bash
# Must wait at least 1 block after commit
flow transactions send ./cadence/transactions/reveal_game.cdc --network testnet --signer testnet-account
```

### Settle Game

```bash
# winningType: 0=Rock, 1=Paper, 2=Scissors (determined by frontend simulation)
flow transactions send ./cadence/transactions/settle_game.cdc 0 --network testnet --signer testnet-account
```

## Contract Addresses

### Dependencies (Testnet)

| Contract | Address |
|----------|---------|
| FungibleToken | 0x9a0766d93b6608b7 |
| FlowToken | 0x7e60df042a9c0868 |
| RandomBeaconHistory | 0x8c5303eaa26202d6 |

### FlowShambo (Deployed)

| Network | Address |
|---------|---------|
| Emulator | 0xf8d6e0586b0a20c7 |
| Testnet | 0x9d8d1e6cee0341ec |

## Troubleshooting

### "Account not found"
- Ensure your testnet account has been created and funded
- Verify the address in flow.json matches your account

### "Insufficient balance"
- Get testnet FLOW from the [Flow Faucet](https://testnet-faucet.onflow.org/)

### "Contract already exists"
- The contract is already deployed to this account
- Use `flow project deploy --update --network testnet` to update

### "Invalid import"
- Verify the dependency addresses in flow.json are correct for testnet
- Check that all imports in the contract use the correct addresses

## Security Notes

1. **Never commit private keys** to version control
2. Add `testnet-account.pkey` to `.gitignore`
3. For production, use a hardware wallet or secure key management
4. The house vault starts empty - fund it before accepting bets

## Next Steps

1. Deploy the contract to testnet
2. Fund the house vault with FLOW tokens
3. Update the frontend with the contract address
4. Test the complete game flow on testnet
