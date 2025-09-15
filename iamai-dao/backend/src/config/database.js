const { Pool } = require('pg');
const logger = require('../utils/logger');

let pool;

const connectDatabase = async () => {
  try {
    pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'iamai_dao',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Test connection
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    
    logger.info('Database connected successfully');
    
    // Initialize tables
    await initializeTables();
    
  } catch (error) {
    logger.error('Database connection failed:', error);
    throw error;
  }
};

const initializeTables = async () => {
  const createTablesQuery = `
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      wallet_address VARCHAR(44) UNIQUE NOT NULL,
      username VARCHAR(50),
      email VARCHAR(255),
      avatar_url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Token transactions
    CREATE TABLE IF NOT EXISTS token_transactions (
      id SERIAL PRIMARY KEY,
      wallet_address VARCHAR(44) NOT NULL,
      transaction_hash VARCHAR(88) NOT NULL,
      transaction_type VARCHAR(20) NOT NULL, -- 'purchase', 'transfer', 'burn'
      amount BIGINT NOT NULL,
      sol_amount DECIMAL(20, 9),
      price_per_token DECIMAL(20, 9),
      status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'confirmed', 'failed'
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Staking positions
    CREATE TABLE IF NOT EXISTS staking_positions (
      id SERIAL PRIMARY KEY,
      wallet_address VARCHAR(44) NOT NULL,
      amount BIGINT NOT NULL,
      duration_days INTEGER NOT NULL,
      apy_rate DECIMAL(5, 2) NOT NULL,
      start_date TIMESTAMP NOT NULL,
      end_date TIMESTAMP NOT NULL,
      rewards_earned BIGINT DEFAULT 0,
      rewards_claimed BIGINT DEFAULT 0,
      status VARCHAR(20) DEFAULT 'active', -- 'active', 'completed', 'unstaked'
      transaction_hash VARCHAR(88),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Governance proposals
    CREATE TABLE IF NOT EXISTS governance_proposals (
      id SERIAL PRIMARY KEY,
      proposer_address VARCHAR(44) NOT NULL,
      title VARCHAR(200) NOT NULL,
      description TEXT NOT NULL,
      proposal_type VARCHAR(20) NOT NULL, -- 'treasury', 'technical', 'community'
      votes_for BIGINT DEFAULT 0,
      votes_against BIGINT DEFAULT 0,
      total_votes BIGINT DEFAULT 0,
      quorum_required BIGINT NOT NULL,
      start_time TIMESTAMP NOT NULL,
      end_time TIMESTAMP NOT NULL,
      execution_time TIMESTAMP,
      status VARCHAR(20) DEFAULT 'active', -- 'active', 'passed', 'rejected', 'executed'
      transaction_hash VARCHAR(88),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Governance votes
    CREATE TABLE IF NOT EXISTS governance_votes (
      id SERIAL PRIMARY KEY,
      proposal_id INTEGER REFERENCES governance_proposals(id),
      voter_address VARCHAR(44) NOT NULL,
      support BOOLEAN NOT NULL,
      voting_power BIGINT NOT NULL,
      transaction_hash VARCHAR(88),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(proposal_id, voter_address)
    );

    -- Marketplace models
    CREATE TABLE IF NOT EXISTS marketplace_models (
      id SERIAL PRIMARY KEY,
      creator_address VARCHAR(44) NOT NULL,
      title VARCHAR(200) NOT NULL,
      description TEXT NOT NULL,
      price BIGINT NOT NULL,
      ipfs_hash VARCHAR(100) NOT NULL,
      model_type VARCHAR(50) NOT NULL,
      category VARCHAR(50),
      tags TEXT[],
      sales_count INTEGER DEFAULT 0,
      total_revenue BIGINT DEFAULT 0,
      rating_sum INTEGER DEFAULT 0,
      rating_count INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      transaction_hash VARCHAR(88),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Model purchases
    CREATE TABLE IF NOT EXISTS model_purchases (
      id SERIAL PRIMARY KEY,
      model_id INTEGER REFERENCES marketplace_models(id),
      buyer_address VARCHAR(44) NOT NULL,
      price_paid BIGINT NOT NULL,
      transaction_hash VARCHAR(88),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(model_id, buyer_address)
    );

    -- Model reviews
    CREATE TABLE IF NOT EXISTS model_reviews (
      id SERIAL PRIMARY KEY,
      model_id INTEGER REFERENCES marketplace_models(id),
      reviewer_address VARCHAR(44) NOT NULL,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      review_text TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(model_id, reviewer_address)
    );

    -- Analytics cache table
    CREATE TABLE IF NOT EXISTS analytics_cache (
      id SERIAL PRIMARY KEY,
      cache_key VARCHAR(255) UNIQUE NOT NULL,
      data JSONB NOT NULL,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- IPFS files table
    CREATE TABLE IF NOT EXISTS ipfs_files (
      id SERIAL PRIMARY KEY,
      hash VARCHAR(255) UNIQUE NOT NULL,
      filename VARCHAR(255) NOT NULL,
      mimetype VARCHAR(100) NOT NULL,
      size BIGINT NOT NULL,
      metadata JSONB,
      pinned BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Create indexes for better performance
    CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address);
    CREATE INDEX IF NOT EXISTS idx_token_transactions_wallet ON token_transactions(wallet_address);
    CREATE INDEX IF NOT EXISTS idx_token_transactions_hash ON token_transactions(transaction_hash);
    CREATE INDEX IF NOT EXISTS idx_staking_positions_wallet ON staking_positions(wallet_address);
    CREATE INDEX IF NOT EXISTS idx_staking_positions_status ON staking_positions(status);
    CREATE INDEX IF NOT EXISTS idx_governance_proposals_status ON governance_proposals(status);
    CREATE INDEX IF NOT EXISTS idx_governance_votes_proposal ON governance_votes(proposal_id);
    CREATE INDEX IF NOT EXISTS idx_marketplace_models_creator ON marketplace_models(creator_address);
    CREATE INDEX IF NOT EXISTS idx_marketplace_models_category ON marketplace_models(category);
    CREATE INDEX IF NOT EXISTS idx_model_purchases_buyer ON model_purchases(buyer_address);
    CREATE INDEX IF NOT EXISTS idx_model_purchases_model ON model_purchases(model_id);
    CREATE INDEX IF NOT EXISTS idx_model_reviews_model ON model_reviews(model_id);
    CREATE INDEX IF NOT EXISTS idx_analytics_cache_key ON analytics_cache(cache_key);
    CREATE INDEX IF NOT EXISTS idx_analytics_cache_expires ON analytics_cache(expires_at);
    CREATE INDEX IF NOT EXISTS idx_ipfs_files_hash ON ipfs_files(hash);
    CREATE INDEX IF NOT EXISTS idx_ipfs_files_mimetype ON ipfs_files(mimetype);
    CREATE INDEX IF NOT EXISTS idx_ipfs_files_pinned ON ipfs_files(pinned);
  `;

  try {
    await pool.query(createTablesQuery);
    logger.info('Database tables initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize database tables:', error);
    throw error;
  }
};

const getPool = () => {
  if (!pool) {
    throw new Error('Database not connected');
  }
  return pool;
};

module.exports = {
  connectDatabase,
  getPool
};
