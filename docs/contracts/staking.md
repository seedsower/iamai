# Staking Contract Documentation

## Overview

The IAMAI Staking contract enables users to stake IAMAI tokens for rewards with multiple tiers and lock durations. Built using the Anchor framework for Solana.

## Contract Details

- **Program ID**: `TBD` (Set during deployment)
- **Supported Lock Periods**: 30, 60, 90, 180 days
- **APY Rates**: 5%, 8%, 12%, 20% respectively
- **Minimum Stake**: 100 IAMAI tokens

## Features

### Staking Tiers
- **Bronze (30 days)**: 5% APY, minimum 100 IAMAI
- **Silver (60 days)**: 8% APY, minimum 500 IAMAI
- **Gold (90 days)**: 12% APY, minimum 1,000 IAMAI
- **Platinum (180 days)**: 20% APY, minimum 5,000 IAMAI

### Reward Mechanism
- Daily reward calculation and distribution
- Compound interest for long-term stakers
- Early unstaking penalty (10% of staked amount)
- Automatic reward claiming on unstake

## Account Structure

### StakingPool
```rust
#[account]
pub struct StakingPool {
    pub authority: Pubkey,          // Pool authority
    pub token_mint: Pubkey,         // IAMAI token mint
    pub token_vault: Pubkey,        // Token vault account
    pub total_staked: u64,          // Total tokens staked
    pub total_rewards_distributed: u64, // Total rewards paid
    pub pool_bump: u8,              // PDA bump seed
    pub vault_bump: u8,             // Vault PDA bump seed
    pub is_paused: bool,            // Emergency pause state
    pub created_at: i64,            // Pool creation timestamp
}
```

### StakingPosition
```rust
#[account]
pub struct StakingPosition {
    pub owner: Pubkey,              // Position owner
    pub pool: Pubkey,               // Associated staking pool
    pub amount: u64,                // Staked amount
    pub tier: StakingTier,          // Staking tier
    pub lock_duration: u64,         // Lock duration in seconds
    pub apy: u16,                   // APY in basis points (500 = 5%)
    pub created_at: i64,            // Stake creation timestamp
    pub unlock_at: i64,             // Unlock timestamp
    pub last_reward_claim: i64,     // Last reward claim timestamp
    pub total_rewards_claimed: u64, // Total rewards claimed
    pub status: PositionStatus,     // Position status
    pub position_bump: u8,          // PDA bump seed
}
```

### Enums
```rust
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum StakingTier {
    Bronze,
    Silver,
    Gold,
    Platinum,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum PositionStatus {
    Active,
    Unstaked,
    Claimed,
}
```

## Instructions

### Initialize Pool
Initializes the staking pool.

```rust
pub fn initialize_pool(
    ctx: Context<InitializePool>,
    pool_bump: u8,
    vault_bump: u8,
) -> Result<()>
```

**Accounts:**
- `pool`: Staking pool account (writable, signer)
- `authority`: Pool authority (signer)
- `token_mint`: IAMAI token mint
- `token_vault`: Token vault account (writable)
- `system_program`: System program
- `token_program`: SPL Token program
- `rent`: Rent sysvar

### Stake Tokens
Creates a new staking position.

```rust
pub fn stake_tokens(
    ctx: Context<StakeTokens>,
    amount: u64,
    lock_duration: u64,
    position_bump: u8,
) -> Result<()>
```

**Accounts:**
- `pool`: Staking pool (writable)
- `position`: Staking position (writable, signer)
- `user`: User account (signer)
- `user_token_account`: User's token account (writable)
- `pool_token_vault`: Pool token vault (writable)
- `token_program`: SPL Token program

**Constraints:**
- Amount >= minimum for selected tier
- Valid lock duration (30, 60, 90, or 180 days)
- User has sufficient token balance
- Pool is not paused

### Claim Rewards
Claims accumulated staking rewards.

```rust
pub fn claim_rewards(
    ctx: Context<ClaimRewards>,
) -> Result<()>
```

**Accounts:**
- `pool`: Staking pool (writable)
- `position`: Staking position (writable)
- `user`: Position owner (signer)
- `user_token_account`: User's token account (writable)
- `pool_token_vault`: Pool token vault (writable)
- `pool_authority`: Pool authority
- `token_program`: SPL Token program

**Constraints:**
- Position is active
- User owns the position
- Rewards available to claim

### Unstake Tokens
Unstakes tokens and claims rewards.

```rust
pub fn unstake_tokens(
    ctx: Context<UnstakeTokens>,
) -> Result<()>
```

**Accounts:**
- `pool`: Staking pool (writable)
- `position`: Staking position (writable)
- `user`: Position owner (signer)
- `user_token_account`: User's token account (writable)
- `pool_token_vault`: Pool token vault (writable)
- `pool_authority`: Pool authority
- `token_program`: SPL Token program

**Constraints:**
- Position is active
- User owns the position

### Emergency Unstake
Allows emergency unstaking with penalty.

```rust
pub fn emergency_unstake(
    ctx: Context<EmergencyUnstake>,
) -> Result<()>
```

**Accounts:** Same as unstake_tokens

**Effects:**
- 10% penalty applied to staked amount
- Forfeits unclaimed rewards
- Immediate token return

## Reward Calculation

### Formula
```rust
pub fn calculate_rewards(
    amount: u64,
    apy: u16,
    duration_seconds: i64,
) -> u64 {
    let annual_rate = apy as f64 / 10000.0; // Convert basis points to decimal
    let seconds_per_year = 365.25 * 24.0 * 3600.0;
    let time_factor = duration_seconds as f64 / seconds_per_year;
    
    (amount as f64 * annual_rate * time_factor) as u64
}
```

### Daily Rewards
```rust
pub fn calculate_daily_rewards(position: &StakingPosition) -> u64 {
    let daily_rate = position.apy as f64 / 10000.0 / 365.25;
    (position.amount as f64 * daily_rate) as u64
}
```

## Events

### TokensStaked
```rust
#[event]
pub struct TokensStaked {
    pub user: Pubkey,
    pub pool: Pubkey,
    pub position: Pubkey,
    pub amount: u64,
    pub tier: StakingTier,
    pub lock_duration: u64,
    pub apy: u16,
    pub unlock_at: i64,
}
```

### RewardsClaimed
```rust
#[event]
pub struct RewardsClaimed {
    pub user: Pubkey,
    pub position: Pubkey,
    pub amount: u64,
    pub total_claimed: u64,
}
```

### TokensUnstaked
```rust
#[event]
pub struct TokensUnstaked {
    pub user: Pubkey,
    pub position: Pubkey,
    pub amount: u64,
    pub rewards: u64,
    pub penalty: u64,
    pub early_unstake: bool,
}
```

## Error Codes

```rust
#[error_code]
pub enum StakingError {
    #[msg("Insufficient stake amount for tier")]
    InsufficientStakeAmount,
    
    #[msg("Invalid lock duration")]
    InvalidLockDuration,
    
    #[msg("Position is locked")]
    PositionLocked,
    
    #[msg("No rewards to claim")]
    NoRewardsToClaim,
    
    #[msg("Pool is paused")]
    PoolPaused,
    
    #[msg("Invalid position owner")]
    InvalidPositionOwner,
    
    #[msg("Position already unstaked")]
    PositionAlreadyUnstaked,
    
    #[msg("Insufficient pool balance")]
    InsufficientPoolBalance,
}
```

## Integration Examples

### Frontend Staking
```typescript
import { PublicKey, Transaction } from '@solana/web3.js';
import { Program, AnchorProvider } from '@coral-xyz/anchor';

async function stakeTokens(
  program: Program,
  amount: number,
  lockDuration: number
) {
  const [poolPda] = await PublicKey.findProgramAddress(
    [Buffer.from("staking_pool")],
    program.programId
  );
  
  const [positionPda] = await PublicKey.findProgramAddress(
    [
      Buffer.from("staking_position"),
      wallet.publicKey.toBuffer(),
      poolPda.toBuffer()
    ],
    program.programId
  );
  
  const tx = await program.methods
    .stakeTokens(
      new anchor.BN(amount * Math.pow(10, 9)),
      new anchor.BN(lockDuration * 24 * 60 * 60),
      positionBump
    )
    .accounts({
      pool: poolPda,
      position: positionPda,
      user: wallet.publicKey,
      userTokenAccount: userTokenAccount,
      poolTokenVault: poolTokenVault,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();
    
  return tx;
}
```

### Backend Reward Calculation
```javascript
function calculateAPY(tier) {
  const apyRates = {
    'bronze': 5.0,
    'silver': 8.0,
    'gold': 12.0,
    'platinum': 20.0
  };
  return apyRates[tier] || 5.0;
}

function calculateRewards(amount, apy, durationDays) {
  const annualRate = apy / 100;
  const timeFactor = durationDays / 365.25;
  return amount * annualRate * timeFactor;
}

function getStakingTier(amount, lockDuration) {
  if (lockDuration >= 180 && amount >= 5000) return 'platinum';
  if (lockDuration >= 90 && amount >= 1000) return 'gold';
  if (lockDuration >= 60 && amount >= 500) return 'silver';
  if (lockDuration >= 30 && amount >= 100) return 'bronze';
  throw new Error('Invalid staking parameters');
}
```

## Security Considerations

### Access Control
- Only position owners can unstake or claim rewards
- Pool authority controls emergency functions
- Time-based locks prevent early unstaking

### Economic Security
- Penalty mechanism discourages early unstaking
- Reward calculations prevent overflow
- Pool balance validation before payouts

### Emergency Procedures
- Pool pause functionality for emergencies
- Emergency unstake with penalty
- Authority-controlled reward rate updates

## Testing

### Unit Tests
```rust
#[cfg(test)]
mod tests {
    use super::*;
    
    #[tokio::test]
    async fn test_stake_tokens() {
        // Test staking functionality
    }
    
    #[tokio::test]
    async fn test_claim_rewards() {
        // Test reward claiming
    }
    
    #[tokio::test]
    async fn test_unstake_tokens() {
        // Test unstaking functionality
    }
    
    #[tokio::test]
    async fn test_early_unstake_penalty() {
        // Test early unstaking penalty
    }
}
```

## Deployment

### Configuration
```toml
[programs.localnet]
staking = "StakingProgramId111111111111111111111111111"

[programs.devnet]
staking = "StakingProgramId111111111111111111111111111"

[programs.mainnet]
staking = "StakingProgramId111111111111111111111111111"
```

### Initialization Script
```bash
#!/bin/bash
anchor build
anchor deploy

# Initialize staking pool
anchor run initialize-pool
```

---

For more information, see the [token contract](./token.md) or [governance contract](./governance.md) documentation.
