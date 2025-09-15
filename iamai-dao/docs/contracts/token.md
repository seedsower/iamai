# Token Contract Documentation

## Overview

The IAMAI Token contract implements a standard SPL token with additional features for governance, staking, and marketplace integration. Built using the Anchor framework for Solana.

## Contract Details

- **Token Symbol**: IAMAI
- **Decimals**: 9
- **Total Supply**: 1,000,000,000 IAMAI
- **Program ID**: `TBD` (Set during deployment)

## Features

### Core Token Functions
- Mint tokens to treasury
- Transfer tokens between accounts
- Burn tokens (deflationary mechanism)
- Freeze/unfreeze accounts (emergency use)

### Advanced Features
- **Governance Integration**: Token holders can participate in DAO governance
- **Staking Rewards**: Automatic reward distribution to stakers
- **Marketplace Integration**: Token used for AI model purchases
- **Vesting Schedules**: Team and investor token vesting

## Account Structure

### Token Account
```rust
#[account]
pub struct TokenAccount {
    pub mint: Pubkey,           // Token mint address
    pub owner: Pubkey,          // Account owner
    pub amount: u64,            // Token balance
    pub delegate: Option<Pubkey>, // Delegate for transfers
    pub state: AccountState,    // Account state (initialized, frozen)
    pub is_native: Option<u64>, // Native account (for wrapped SOL)
    pub delegated_amount: u64,  // Amount delegated
    pub close_authority: Option<Pubkey>, // Authority to close account
}
```

### Mint Account
```rust
#[account]
pub struct Mint {
    pub mint_authority: Option<Pubkey>, // Authority to mint tokens
    pub supply: u64,                    // Current supply
    pub decimals: u8,                   // Decimal places
    pub is_initialized: bool,           // Initialization state
    pub freeze_authority: Option<Pubkey>, // Authority to freeze accounts
}
```

## Instructions

### Initialize Token
Initializes the IAMAI token mint.

```rust
pub fn initialize_token(
    ctx: Context<InitializeToken>,
    decimals: u8,
    mint_authority: Pubkey,
    freeze_authority: Option<Pubkey>,
) -> Result<()>
```

**Accounts:**
- `mint`: Token mint account (writable, signer)
- `rent`: Rent sysvar
- `token_program`: SPL Token program

### Mint Tokens
Mints new tokens to specified account.

```rust
pub fn mint_tokens(
    ctx: Context<MintTokens>,
    amount: u64,
) -> Result<()>
```

**Accounts:**
- `mint`: Token mint account (writable)
- `to`: Destination token account (writable)
- `authority`: Mint authority (signer)
- `token_program`: SPL Token program

**Constraints:**
- Only mint authority can mint tokens
- Amount must be > 0
- Total supply cannot exceed maximum

### Transfer Tokens
Transfers tokens between accounts.

```rust
pub fn transfer_tokens(
    ctx: Context<TransferTokens>,
    amount: u64,
) -> Result<()>
```

**Accounts:**
- `from`: Source token account (writable)
- `to`: Destination token account (writable)
- `authority`: Transfer authority (signer)
- `token_program`: SPL Token program

**Constraints:**
- Authority must own the source account or be delegate
- Sufficient balance in source account
- Amount must be > 0

### Burn Tokens
Burns tokens from an account.

```rust
pub fn burn_tokens(
    ctx: Context<BurnTokens>,
    amount: u64,
) -> Result<()>
```

**Accounts:**
- `mint`: Token mint account (writable)
- `from`: Source token account (writable)
- `authority`: Burn authority (signer)
- `token_program`: SPL Token program

## Events

### TokenMinted
```rust
#[event]
pub struct TokenMinted {
    pub mint: Pubkey,
    pub to: Pubkey,
    pub amount: u64,
    pub new_supply: u64,
}
```

### TokenTransferred
```rust
#[event]
pub struct TokenTransferred {
    pub from: Pubkey,
    pub to: Pubkey,
    pub amount: u64,
}
```

### TokenBurned
```rust
#[event]
pub struct TokenBurned {
    pub mint: Pubkey,
    pub from: Pubkey,
    pub amount: u64,
    pub new_supply: u64,
}
```

## Error Codes

```rust
#[error_code]
pub enum TokenError {
    #[msg("Insufficient balance")]
    InsufficientBalance,
    
    #[msg("Invalid mint authority")]
    InvalidMintAuthority,
    
    #[msg("Invalid transfer authority")]
    InvalidTransferAuthority,
    
    #[msg("Amount must be greater than zero")]
    InvalidAmount,
    
    #[msg("Maximum supply exceeded")]
    MaxSupplyExceeded,
    
    #[msg("Account is frozen")]
    AccountFrozen,
}
```

## Integration Examples

### Frontend Token Transfer
```typescript
import { PublicKey, Transaction } from '@solana/web3.js';
import { createTransferInstruction } from '@solana/spl-token';

async function transferTokens(
  connection: Connection,
  wallet: any,
  fromTokenAccount: PublicKey,
  toTokenAccount: PublicKey,
  amount: number
) {
  const transaction = new Transaction();
  
  const transferInstruction = createTransferInstruction(
    fromTokenAccount,
    toTokenAccount,
    wallet.publicKey,
    amount * Math.pow(10, 9) // Convert to smallest unit
  );
  
  transaction.add(transferInstruction);
  
  const signature = await wallet.sendTransaction(transaction, connection);
  await connection.confirmTransaction(signature);
  
  return signature;
}
```

### Backend Token Balance Query
```javascript
const { Connection, PublicKey } = require('@solana/web3.js');
const { getAccount } = require('@solana/spl-token');

async function getTokenBalance(walletAddress, tokenMint) {
  const connection = new Connection(process.env.SOLANA_RPC_URL);
  
  try {
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      new PublicKey(walletAddress),
      { mint: new PublicKey(tokenMint) }
    );
    
    if (tokenAccounts.value.length === 0) {
      return 0;
    }
    
    const balance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
    return balance;
  } catch (error) {
    console.error('Error fetching token balance:', error);
    return 0;
  }
}
```

## Security Considerations

### Access Control
- Mint authority should be a multisig or DAO-controlled account
- Freeze authority should only be used in emergency situations
- Regular audits of token distribution and supply

### Best Practices
- Always validate account ownership before transfers
- Implement proper error handling for all operations
- Use program derived addresses (PDAs) for system accounts
- Regular monitoring of token metrics and unusual activity

## Testing

### Unit Tests
```rust
#[cfg(test)]
mod tests {
    use super::*;
    use anchor_lang::prelude::*;
    
    #[tokio::test]
    async fn test_mint_tokens() {
        // Test token minting functionality
    }
    
    #[tokio::test]
    async fn test_transfer_tokens() {
        // Test token transfer functionality
    }
    
    #[tokio::test]
    async fn test_burn_tokens() {
        // Test token burning functionality
    }
}
```

### Integration Tests
```typescript
describe('Token Contract Integration', () => {
  it('should mint tokens to treasury', async () => {
    // Integration test for minting
  });
  
  it('should transfer tokens between accounts', async () => {
    // Integration test for transfers
  });
  
  it('should burn tokens correctly', async () => {
    // Integration test for burning
  });
});
```

## Deployment

### Local Deployment
```bash
anchor build
anchor deploy --provider.cluster localnet
```

### Devnet Deployment
```bash
anchor build
anchor deploy --provider.cluster devnet
```

### Mainnet Deployment
```bash
anchor build
anchor deploy --provider.cluster mainnet
```

## Monitoring

### Key Metrics
- Total supply
- Circulating supply
- Number of token holders
- Transfer volume
- Burn rate

### Alerts
- Unusual minting activity
- Large token transfers
- Account freeze events
- Supply changes

---

For more information, see the [API documentation](../API.md) or [deployment guide](../DEPLOYMENT.md).
