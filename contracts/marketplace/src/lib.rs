use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("CDg2vpzshYKscaXa42PvP4PCKShWj6etDoyda86Fz47y");

#[program]
pub mod iamai_marketplace {
    use super::*;

    pub fn initialize_marketplace(
        ctx: Context<InitializeMarketplace>,
        royalty_percentage: u16, // basis points
    ) -> Result<()> {
        let marketplace = &mut ctx.accounts.marketplace;
        marketplace.authority = ctx.accounts.authority.key();
        marketplace.token_mint = ctx.accounts.token_mint.key();
        marketplace.treasury = ctx.accounts.treasury.key();
        marketplace.royalty_percentage = royalty_percentage;
        marketplace.total_models = 0;
        marketplace.total_sales = 0;
        marketplace.total_volume = 0;
        marketplace.is_initialized = true;
        Ok(())
    }

    pub fn list_model(
        ctx: Context<ListModel>,
        title: String,
        description: String,
        price: u64,
        ipfs_hash: String,
        model_type: ModelType,
    ) -> Result<()> {
        let marketplace = &mut ctx.accounts.marketplace;
        let model_listing = &mut ctx.accounts.model_listing;

        let clock = Clock::get()?;

        // Initialize model listing
        model_listing.marketplace = marketplace.key();
        model_listing.creator = ctx.accounts.creator.key();
        model_listing.title = title;
        model_listing.description = description;
        model_listing.price = price;
        model_listing.ipfs_hash = ipfs_hash;
        model_listing.model_type = model_type;
        model_listing.created_at = clock.unix_timestamp;
        model_listing.sales_count = 0;
        model_listing.total_revenue = 0;
        model_listing.is_active = true;
        model_listing.rating_sum = 0;
        model_listing.rating_count = 0;

        // Update marketplace totals
        marketplace.total_models += 1;

        Ok(())
    }

    pub fn purchase_model(
        ctx: Context<PurchaseModel>,
    ) -> Result<()> {
        let marketplace = &mut ctx.accounts.marketplace;
        let model_listing = &mut ctx.accounts.model_listing;
        let purchase_record = &mut ctx.accounts.purchase_record;

        require!(model_listing.is_active, ErrorCode::ModelNotActive);

        let clock = Clock::get()?;
        let price = model_listing.price;

        // Calculate royalty
        let royalty_amount = (price * marketplace.royalty_percentage as u64) / 10000;
        let creator_amount = price - royalty_amount;

        // Transfer royalty to treasury
        if royalty_amount > 0 {
            let cpi_accounts = Transfer {
                from: ctx.accounts.buyer_token_account.to_account_info(),
                to: ctx.accounts.treasury.to_account_info(),
                authority: ctx.accounts.buyer.to_account_info(),
            };
            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
            token::transfer(cpi_ctx, royalty_amount)?;
        }

        // Transfer payment to creator
        let cpi_accounts = Transfer {
            from: ctx.accounts.buyer_token_account.to_account_info(),
            to: ctx.accounts.creator_token_account.to_account_info(),
            authority: ctx.accounts.buyer.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, creator_amount)?;

        // Create purchase record
        purchase_record.buyer = ctx.accounts.buyer.key();
        purchase_record.model = model_listing.key();
        purchase_record.price_paid = price;
        purchase_record.purchased_at = clock.unix_timestamp;
        purchase_record.has_access = true;

        // Update statistics
        model_listing.sales_count += 1;
        model_listing.total_revenue += price;
        marketplace.total_sales += 1;
        marketplace.total_volume += price;

        Ok(())
    }

    pub fn rate_model(
        ctx: Context<RateModel>,
        rating: u8, // 1-5 stars
        review: String,
    ) -> Result<()> {
        let model_listing = &mut ctx.accounts.model_listing;
        let purchase_record = &ctx.accounts.purchase_record;
        let model_review = &mut ctx.accounts.model_review;

        require!(rating >= 1 && rating <= 5, ErrorCode::InvalidRating);
        require!(purchase_record.has_access, ErrorCode::NoAccessToModel);

        let clock = Clock::get()?;

        // Create review
        model_review.reviewer = ctx.accounts.reviewer.key();
        model_review.model = model_listing.key();
        model_review.rating = rating;
        model_review.review = review;
        model_review.created_at = clock.unix_timestamp;

        // Update model rating
        model_listing.rating_sum += rating as u64;
        model_listing.rating_count += 1;

        Ok(())
    }

    pub fn update_model_status(
        ctx: Context<UpdateModelStatus>,
        is_active: bool,
    ) -> Result<()> {
        let model_listing = &mut ctx.accounts.model_listing;
        
        require!(
            ctx.accounts.creator.key() == model_listing.creator,
            ErrorCode::Unauthorized
        );

        model_listing.is_active = is_active;
        Ok(())
    }

    pub fn get_model_access(
        ctx: Context<GetModelAccess>,
    ) -> Result<bool> {
        let purchase_record = &ctx.accounts.purchase_record;
        Ok(purchase_record.has_access)
    }
}

#[derive(Accounts)]
pub struct InitializeMarketplace<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Marketplace::INIT_SPACE
    )]
    pub marketplace: Account<'info, Marketplace>,
    
    pub token_mint: Account<'info, anchor_spl::token::Mint>,
    
    pub treasury: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ListModel<'info> {
    #[account(mut)]
    pub marketplace: Account<'info, Marketplace>,
    
    #[account(
        init,
        payer = creator,
        space = 8 + ModelListing::INIT_SPACE
    )]
    pub model_listing: Account<'info, ModelListing>,
    
    #[account(mut)]
    pub creator: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PurchaseModel<'info> {
    #[account(mut)]
    pub marketplace: Account<'info, Marketplace>,
    
    #[account(mut)]
    pub model_listing: Account<'info, ModelListing>,
    
    #[account(
        init,
        payer = buyer,
        space = 8 + PurchaseRecord::INIT_SPACE,
        seeds = [b"purchase", model_listing.key().as_ref(), buyer.key().as_ref()],
        bump,
    )]
    pub purchase_record: Account<'info, PurchaseRecord>,
    
    #[account(mut)]
    pub buyer_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub creator_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub treasury: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub buyer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct RateModel<'info> {
    #[account(mut)]
    pub model_listing: Account<'info, ModelListing>,
    
    #[account(
        seeds = [b"purchase", model_listing.key().as_ref(), reviewer.key().as_ref()],
        bump,
    )]
    pub purchase_record: Account<'info, PurchaseRecord>,
    
    #[account(
        init,
        payer = reviewer,
        space = 8 + ModelReview::INIT_SPACE,
        seeds = [b"review", model_listing.key().as_ref(), reviewer.key().as_ref()],
        bump,
    )]
    pub model_review: Account<'info, ModelReview>,
    
    #[account(mut)]
    pub reviewer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateModelStatus<'info> {
    #[account(mut)]
    pub model_listing: Account<'info, ModelListing>,
    
    pub creator: Signer<'info>,
}

#[derive(Accounts)]
pub struct GetModelAccess<'info> {
    #[account(
        seeds = [b"purchase", model_listing.key().as_ref(), user.key().as_ref()],
        bump,
    )]
    pub purchase_record: Account<'info, PurchaseRecord>,
    
    pub model_listing: Account<'info, ModelListing>,
    pub user: Signer<'info>,
}

#[account]
#[derive(InitSpace)]
pub struct Marketplace {
    pub authority: Pubkey,
    pub token_mint: Pubkey,
    pub treasury: Pubkey,
    pub royalty_percentage: u16, // basis points
    pub total_models: u64,
    pub total_sales: u64,
    pub total_volume: u64,
    pub is_initialized: bool,
}

#[account]
#[derive(InitSpace)]
pub struct ModelListing {
    pub marketplace: Pubkey,
    pub creator: Pubkey,
    #[max_len(100)]
    pub title: String,
    #[max_len(500)]
    pub description: String,
    pub price: u64,
    #[max_len(100)]
    pub ipfs_hash: String,
    pub model_type: ModelType,
    pub created_at: i64,
    pub sales_count: u64,
    pub total_revenue: u64,
    pub is_active: bool,
    pub rating_sum: u64,
    pub rating_count: u64,
}

#[account]
#[derive(InitSpace)]
pub struct PurchaseRecord {
    pub buyer: Pubkey,
    pub model: Pubkey,
    pub price_paid: u64,
    pub purchased_at: i64,
    pub has_access: bool,
}

#[account]
#[derive(InitSpace)]
pub struct ModelReview {
    pub reviewer: Pubkey,
    pub model: Pubkey,
    pub rating: u8,
    #[max_len(500)]
    pub review: String,
    pub created_at: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum ModelType {
    LanguageModel,
    ImageGeneration,
    AudioProcessing,
    DataAnalysis,
    ComputerVision,
    Other,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Model is not active")]
    ModelNotActive,
    #[msg("Invalid rating value")]
    InvalidRating,
    #[msg("No access to this model")]
    NoAccessToModel,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Insufficient funds")]
    InsufficientFunds,
}
