use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};

declare_id!("5kzjdRm4pHrTrqpijSB8QYE8tN9yCnmbHw49iX3DXc9y");

#[program]
pub mod iamai_governance {
    use super::*;

    pub fn initialize_governance(
        ctx: Context<InitializeGovernance>,
        min_tokens_for_proposal: u64,
        quorum_percentage: u8,
        execution_delay: i64,
    ) -> Result<()> {
        let governance = &mut ctx.accounts.governance;
        governance.authority = ctx.accounts.authority.key();
        governance.token_mint = ctx.accounts.token_mint.key();
        governance.min_tokens_for_proposal = min_tokens_for_proposal;
        governance.quorum_percentage = quorum_percentage;
        governance.execution_delay = execution_delay;
        governance.proposal_count = 0;
        governance.is_initialized = true;
        Ok(())
    }

    pub fn create_proposal(
        ctx: Context<CreateProposal>,
        title: String,
        description: String,
        proposal_type: ProposalType,
        voting_period: i64,
    ) -> Result<()> {
        let governance = &mut ctx.accounts.governance;
        let proposal = &mut ctx.accounts.proposal;
        let user_token_account = &ctx.accounts.user_token_account;

        // Check if user has enough tokens
        require!(
            user_token_account.amount >= governance.min_tokens_for_proposal,
            ErrorCode::InsufficientTokensForProposal
        );

        let clock = Clock::get()?;
        let current_time = clock.unix_timestamp;

        // Initialize proposal
        proposal.governance = governance.key();
        proposal.proposer = ctx.accounts.proposer.key();
        proposal.title = title;
        proposal.description = description;
        proposal.proposal_type = proposal_type;
        proposal.votes_for = 0;
        proposal.votes_against = 0;
        proposal.total_votes = 0;
        proposal.start_time = current_time;
        proposal.end_time = current_time + voting_period;
        proposal.execution_time = 0;
        proposal.status = ProposalStatus::Active;
        proposal.quorum_reached = false;

        // Increment proposal count
        governance.proposal_count += 1;

        Ok(())
    }

    pub fn vote_on_proposal(
        ctx: Context<VoteOnProposal>,
        support: bool,
        voting_power: u64,
    ) -> Result<()> {
        let proposal = &mut ctx.accounts.proposal;
        let vote_record = &mut ctx.accounts.vote_record;
        let user_token_account = &ctx.accounts.user_token_account;

        require!(
            proposal.status == ProposalStatus::Active,
            ErrorCode::ProposalNotActive
        );

        let clock = Clock::get()?;
        let current_time = clock.unix_timestamp;

        require!(
            current_time >= proposal.start_time && current_time <= proposal.end_time,
            ErrorCode::VotingPeriodEnded
        );

        // Verify voting power matches token balance
        require!(
            voting_power <= user_token_account.amount,
            ErrorCode::InsufficientVotingPower
        );

        // Check if user already voted
        require!(!vote_record.has_voted, ErrorCode::AlreadyVoted);

        // Record vote
        vote_record.voter = ctx.accounts.voter.key();
        vote_record.proposal = proposal.key();
        vote_record.support = support;
        vote_record.voting_power = voting_power;
        vote_record.has_voted = true;

        // Update proposal vote counts
        if support {
            proposal.votes_for += voting_power;
        } else {
            proposal.votes_against += voting_power;
        }
        proposal.total_votes += voting_power;

        Ok(())
    }

    pub fn finalize_proposal(ctx: Context<FinalizeProposal>) -> Result<()> {
        let governance = &ctx.accounts.governance;
        let proposal = &mut ctx.accounts.proposal;

        require!(
            proposal.status == ProposalStatus::Active,
            ErrorCode::ProposalNotActive
        );

        let clock = Clock::get()?;
        let current_time = clock.unix_timestamp;

        require!(
            current_time > proposal.end_time,
            ErrorCode::VotingPeriodNotEnded
        );

        // Calculate quorum (simplified - in practice would need total supply)
        let total_supply = 1_000_000_000u64; // Mock total supply
        let required_quorum = (total_supply * governance.quorum_percentage as u64) / 100;
        
        proposal.quorum_reached = proposal.total_votes >= required_quorum;

        // Determine proposal outcome
        if proposal.quorum_reached && proposal.votes_for > proposal.votes_against {
            proposal.status = ProposalStatus::Passed;
            proposal.execution_time = current_time + governance.execution_delay;
        } else {
            proposal.status = ProposalStatus::Rejected;
        }

        Ok(())
    }

    pub fn execute_proposal(ctx: Context<ExecuteProposal>) -> Result<()> {
        let proposal = &mut ctx.accounts.proposal;

        require!(
            proposal.status == ProposalStatus::Passed,
            ErrorCode::ProposalNotPassed
        );

        let clock = Clock::get()?;
        let current_time = clock.unix_timestamp;

        require!(
            current_time >= proposal.execution_time,
            ErrorCode::ExecutionDelayNotMet
        );

        // Execute proposal based on type
        match proposal.proposal_type {
            ProposalType::Treasury => {
                // Handle treasury proposal execution
                msg!("Executing treasury proposal: {}", proposal.title);
            }
            ProposalType::Technical => {
                // Handle technical proposal execution
                msg!("Executing technical proposal: {}", proposal.title);
            }
            ProposalType::Community => {
                // Handle community proposal execution
                msg!("Executing community proposal: {}", proposal.title);
            }
        }

        proposal.status = ProposalStatus::Executed;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeGovernance<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Governance::INIT_SPACE
    )]
    pub governance: Account<'info, Governance>,
    
    pub token_mint: Account<'info, anchor_spl::token::Mint>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateProposal<'info> {
    #[account(mut)]
    pub governance: Account<'info, Governance>,
    
    #[account(
        init,
        payer = proposer,
        space = 8 + Proposal::INIT_SPACE
    )]
    pub proposal: Account<'info, Proposal>,
    
    pub user_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub proposer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct VoteOnProposal<'info> {
    #[account(mut)]
    pub proposal: Account<'info, Proposal>,
    
    #[account(
        init,
        payer = voter,
        space = 8 + VoteRecord::INIT_SPACE,
        seeds = [b"vote", proposal.key().as_ref(), voter.key().as_ref()],
        bump,
    )]
    pub vote_record: Account<'info, VoteRecord>,
    
    pub user_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub voter: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FinalizeProposal<'info> {
    pub governance: Account<'info, Governance>,
    
    #[account(mut)]
    pub proposal: Account<'info, Proposal>,
}

#[derive(Accounts)]
pub struct ExecuteProposal<'info> {
    #[account(mut)]
    pub proposal: Account<'info, Proposal>,
    
    pub executor: Signer<'info>,
}

#[account]
#[derive(InitSpace)]
pub struct Governance {
    pub authority: Pubkey,
    pub token_mint: Pubkey,
    pub min_tokens_for_proposal: u64,
    pub quorum_percentage: u8,
    pub execution_delay: i64,
    pub proposal_count: u64,
    pub is_initialized: bool,
}

#[account]
#[derive(InitSpace)]
pub struct Proposal {
    pub governance: Pubkey,
    pub proposer: Pubkey,
    #[max_len(100)]
    pub title: String,
    #[max_len(1000)]
    pub description: String,
    pub proposal_type: ProposalType,
    pub votes_for: u64,
    pub votes_against: u64,
    pub total_votes: u64,
    pub start_time: i64,
    pub end_time: i64,
    pub execution_time: i64,
    pub status: ProposalStatus,
    pub quorum_reached: bool,
}

#[account]
#[derive(InitSpace)]
pub struct VoteRecord {
    pub voter: Pubkey,
    pub proposal: Pubkey,
    pub support: bool,
    pub voting_power: u64,
    pub has_voted: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum ProposalType {
    Treasury,
    Technical,
    Community,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum ProposalStatus {
    Active,
    Passed,
    Rejected,
    Executed,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Insufficient tokens to create proposal")]
    InsufficientTokensForProposal,
    #[msg("Proposal is not active")]
    ProposalNotActive,
    #[msg("Voting period has ended")]
    VotingPeriodEnded,
    #[msg("Insufficient voting power")]
    InsufficientVotingPower,
    #[msg("User has already voted")]
    AlreadyVoted,
    #[msg("Voting period has not ended")]
    VotingPeriodNotEnded,
    #[msg("Proposal has not passed")]
    ProposalNotPassed,
    #[msg("Execution delay not met")]
    ExecutionDelayNotMet,
}
