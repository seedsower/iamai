use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("22222222222222222222222222222222");

#[program]
pub mod iamai_staking {
    use super::*;

    pub fn initialize_staking(
        ctx: Context<InitializeStaking>,
        early_unstake_penalty: u16, // basis points
    ) -> Result<()> {
        let staking_pool = &mut ctx.accounts.staking_pool;
        staking_pool.authority = ctx.accounts.authority.key();
        staking_pool.token_mint = ctx.accounts.token_mint.key();
        staking_pool.vault = ctx.accounts.vault.key();
        staking_pool.early_unstake_penalty = early_unstake_penalty;
        staking_pool.total_staked = 0;
        staking_pool.total_rewards_distributed = 0;
        staking_pool.is_initialized = true;
        Ok(())
    }

    pub fn create_staking_tier(
        ctx: Context<CreateStakingTier>,
        duration_days: u32,
        apy_basis_points: u16,
    ) -> Result<()> {
        let staking_tier = &mut ctx.accounts.staking_tier;
        staking_tier.pool = ctx.accounts.staking_pool.key();
        staking_tier.duration_days = duration_days;
        staking_tier.apy_basis_points = apy_basis_points;
        staking_tier.total_staked = 0;
        staking_tier.is_active = true;
        Ok(())
    }

    pub fn stake_tokens(
        ctx: Context<StakeTokens>,
        amount: u64,
        tier_index: u8,
    ) -> Result<()> {
        let staking_pool = &mut ctx.accounts.staking_pool;
        let staking_tier = &mut ctx.accounts.staking_tier;
        let user_stake = &mut ctx.accounts.user_stake;

        let clock = Clock::get()?;
        let start_time = clock.unix_timestamp;
        let end_time = start_time + (staking_tier.duration_days as i64 * 24 * 60 * 60);

        // Initialize user stake
        user_stake.user = ctx.accounts.user.key();
        user_stake.pool = staking_pool.key();
        user_stake.tier = staking_tier.key();
        user_stake.amount = amount;
        user_stake.start_time = start_time;
        user_stake.end_time = end_time;
        user_stake.rewards_claimed = 0;
        user_stake.is_active = true;

        // Update pool and tier totals
        staking_pool.total_staked += amount;
        staking_tier.total_staked += amount;

        // Transfer tokens to vault
        let cpi_accounts = Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, amount)?;

        Ok(())
    }

    pub fn unstake_tokens(
        ctx: Context<UnstakeTokens>,
        early_unstake: bool,
    ) -> Result<()> {
        let staking_pool = &mut ctx.accounts.staking_pool;
        let staking_tier = &mut ctx.accounts.staking_tier;
        let user_stake = &mut ctx.accounts.user_stake;

        require!(user_stake.is_active, ErrorCode::StakeNotActive);

        let clock = Clock::get()?;
        let current_time = clock.unix_timestamp;

        let mut amount_to_return = user_stake.amount;
        let mut penalty = 0u64;

        // Check if early unstaking
        if current_time < user_stake.end_time {
            require!(early_unstake, ErrorCode::StakingPeriodNotComplete);
            penalty = (user_stake.amount * staking_pool.early_unstake_penalty as u64) / 10000;
            amount_to_return -= penalty;
        }

        // Calculate and add pending rewards
        let rewards = calculate_rewards(user_stake, staking_tier, current_time)?;
        amount_to_return += rewards;

        // Update totals
        staking_pool.total_staked -= user_stake.amount;
        staking_tier.total_staked -= user_stake.amount;
        staking_pool.total_rewards_distributed += rewards;

        // Mark stake as inactive
        user_stake.is_active = false;
        user_stake.rewards_claimed += rewards;

        // Transfer tokens back to user
        let seeds = &[
            b"vault",
            staking_pool.key().as_ref(),
            &[ctx.bumps.vault],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.vault.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, amount_to_return)?;

        Ok(())
    }

    pub fn claim_rewards(ctx: Context<ClaimRewards>) -> Result<()> {
        let staking_pool = &mut ctx.accounts.staking_pool;
        let staking_tier = &ctx.accounts.staking_tier;
        let user_stake = &mut ctx.accounts.user_stake;

        require!(user_stake.is_active, ErrorCode::StakeNotActive);

        let clock = Clock::get()?;
        let current_time = clock.unix_timestamp;

        let rewards = calculate_rewards(user_stake, staking_tier, current_time)?;
        require!(rewards > 0, ErrorCode::NoRewardsAvailable);

        // Update totals
        staking_pool.total_rewards_distributed += rewards;
        user_stake.rewards_claimed += rewards;

        // Transfer rewards to user
        let seeds = &[
            b"vault",
            staking_pool.key().as_ref(),
            &[ctx.bumps.vault],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.vault.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, rewards)?;

        Ok(())
    }
}

fn calculate_rewards(
    user_stake: &UserStake,
    staking_tier: &StakingTier,
    current_time: i64,
) -> Result<u64> {
    let staking_duration = std::cmp::min(current_time, user_stake.end_time) - user_stake.start_time;
    let annual_seconds = 365 * 24 * 60 * 60;
    
    let rewards = (user_stake.amount as u128 * staking_tier.apy_basis_points as u128 * staking_duration as u128)
        / (10000u128 * annual_seconds as u128);
    
    Ok(rewards as u64 - user_stake.rewards_claimed)
}

#[derive(Accounts)]
pub struct InitializeStaking<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + StakingPool::INIT_SPACE
    )]
    pub staking_pool: Account<'info, StakingPool>,
    
    pub token_mint: Account<'info, anchor_spl::token::Mint>,
    
    #[account(
        init,
        payer = authority,
        seeds = [b"vault", staking_pool.key().as_ref()],
        bump,
        token::mint = token_mint,
        token::authority = vault,
    )]
    pub vault: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct CreateStakingTier<'info> {
    #[account(mut)]
    pub staking_pool: Account<'info, StakingPool>,
    
    #[account(
        init,
        payer = authority,
        space = 8 + StakingTier::INIT_SPACE
    )]
    pub staking_tier: Account<'info, StakingTier>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct StakeTokens<'info> {
    #[account(mut)]
    pub staking_pool: Account<'info, StakingPool>,
    
    #[account(mut)]
    pub staking_tier: Account<'info, StakingTier>,
    
    #[account(
        init,
        payer = user,
        space = 8 + UserStake::INIT_SPACE,
        seeds = [b"user_stake", user.key().as_ref(), staking_pool.key().as_ref()],
        bump,
    )]
    pub user_stake: Account<'info, UserStake>,
    
    #[account(mut)]
    pub vault: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct UnstakeTokens<'info> {
    #[account(mut)]
    pub staking_pool: Account<'info, StakingPool>,
    
    #[account(mut)]
    pub staking_tier: Account<'info, StakingTier>,
    
    #[account(
        mut,
        seeds = [b"user_stake", user.key().as_ref(), staking_pool.key().as_ref()],
        bump,
    )]
    pub user_stake: Account<'info, UserStake>,
    
    #[account(
        mut,
        seeds = [b"vault", staking_pool.key().as_ref()],
        bump,
    )]
    pub vault: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ClaimRewards<'info> {
    #[account(mut)]
    pub staking_pool: Account<'info, StakingPool>,
    
    pub staking_tier: Account<'info, StakingTier>,
    
    #[account(
        mut,
        seeds = [b"user_stake", user.key().as_ref(), staking_pool.key().as_ref()],
        bump,
    )]
    pub user_stake: Account<'info, UserStake>,
    
    #[account(
        mut,
        seeds = [b"vault", staking_pool.key().as_ref()],
        bump,
    )]
    pub vault: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[account]
#[derive(InitSpace)]
pub struct StakingPool {
    pub authority: Pubkey,
    pub token_mint: Pubkey,
    pub vault: Pubkey,
    pub early_unstake_penalty: u16, // basis points
    pub total_staked: u64,
    pub total_rewards_distributed: u64,
    pub is_initialized: bool,
}

#[account]
#[derive(InitSpace)]
pub struct StakingTier {
    pub pool: Pubkey,
    pub duration_days: u32,
    pub apy_basis_points: u16,
    pub total_staked: u64,
    pub is_active: bool,
}

#[account]
#[derive(InitSpace)]
pub struct UserStake {
    pub user: Pubkey,
    pub pool: Pubkey,
    pub tier: Pubkey,
    pub amount: u64,
    pub start_time: i64,
    pub end_time: i64,
    pub rewards_claimed: u64,
    pub is_active: bool,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Stake is not active")]
    StakeNotActive,
    #[msg("Staking period not complete")]
    StakingPeriodNotComplete,
    #[msg("No rewards available")]
    NoRewardsAvailable,
    #[msg("Invalid staking tier")]
    InvalidStakingTier,
}
