const { Pool } = require('pg');
const Redis = require('redis');
require('dotenv').config({ path: '.env.test' });

// Test database configuration
const testDbConfig = {
  host: process.env.TEST_DB_HOST || 'localhost',
  port: process.env.TEST_DB_PORT || 5432,
  database: process.env.TEST_DB_NAME || 'iamai_dao_test',
  user: process.env.TEST_DB_USER || 'postgres',
  password: process.env.TEST_DB_PASSWORD || 'password',
};

// Test Redis configuration
const testRedisConfig = {
  host: process.env.TEST_REDIS_HOST || 'localhost',
  port: process.env.TEST_REDIS_PORT || 6379,
  db: process.env.TEST_REDIS_DB || 1,
};

let testPool;
let testRedis;

// Setup test database
async function setupTestDatabase() {
  testPool = new Pool(testDbConfig);
  
  // Clear all tables
  await testPool.query(`
    TRUNCATE TABLE 
      users,
      token_transactions,
      staking_positions,
      governance_proposals,
      governance_votes,
      marketplace_models,
      model_purchases,
      model_reviews,
      analytics_cache,
      ipfs_files
    RESTART IDENTITY CASCADE
  `);
  
  console.log('Test database setup complete');
}

// Setup test Redis
async function setupTestRedis() {
  testRedis = Redis.createClient(testRedisConfig);
  await testRedis.connect();
  await testRedis.flushDb();
  
  console.log('Test Redis setup complete');
}

// Cleanup test environment
async function cleanupTestEnvironment() {
  if (testPool) {
    await testPool.end();
  }
  
  if (testRedis) {
    await testRedis.quit();
  }
  
  console.log('Test environment cleanup complete');
}

// Create test user
async function createTestUser(walletAddress = 'TestWallet123456789') {
  const result = await testPool.query(`
    INSERT INTO users (wallet_address, username, email)
    VALUES ($1, $2, $3)
    RETURNING *
  `, [walletAddress, 'testuser', 'test@example.com']);
  
  return result.rows[0];
}

// Create test token transaction
async function createTestTokenTransaction(walletAddress, amount = 1000000000) {
  const result = await testPool.query(`
    INSERT INTO token_transactions (
      wallet_address, 
      transaction_hash, 
      transaction_type, 
      amount, 
      sol_amount, 
      status
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `, [
    walletAddress,
    'test_hash_' + Date.now(),
    'purchase',
    amount,
    0.1,
    'confirmed'
  ]);
  
  return result.rows[0];
}

// Create test staking position
async function createTestStakingPosition(walletAddress, amount = 500000000) {
  const result = await testPool.query(`
    INSERT INTO staking_positions (
      wallet_address,
      amount,
      tier,
      apy,
      lock_duration,
      status
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `, [
    walletAddress,
    amount,
    'bronze',
    5.0,
    30,
    'active'
  ]);
  
  return result.rows[0];
}

// Create test governance proposal
async function createTestGovernanceProposal(proposerAddress) {
  const result = await testPool.query(`
    INSERT INTO governance_proposals (
      proposer_address,
      title,
      description,
      proposal_type,
      voting_ends_at,
      status
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `, [
    proposerAddress,
    'Test Proposal',
    'This is a test proposal for testing purposes',
    'general',
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    'active'
  ]);
  
  return result.rows[0];
}

// Create test marketplace model
async function createTestMarketplaceModel(creatorAddress) {
  const result = await testPool.query(`
    INSERT INTO marketplace_models (
      creator_address,
      title,
      description,
      category,
      price,
      ipfs_hash,
      metadata_hash,
      is_active
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `, [
    creatorAddress,
    'Test AI Model',
    'A test AI model for testing purposes',
    'nlp',
    100000000, // 0.1 IAMAI tokens
    'QmTestHash123456789',
    'QmTestMetadataHash123456789',
    true
  ]);
  
  return result.rows[0];
}

// Mock Solana connection for tests
const mockSolanaConnection = {
  getBalance: jest.fn().mockResolvedValue(1000000000), // 1 SOL
  getTokenAccountBalance: jest.fn().mockResolvedValue({
    value: { amount: '1000000000', decimals: 9 }
  }),
  sendTransaction: jest.fn().mockResolvedValue('mock_signature'),
  confirmTransaction: jest.fn().mockResolvedValue({ value: { err: null } }),
  getRecentBlockhash: jest.fn().mockResolvedValue({
    blockhash: 'mock_blockhash',
    feeCalculator: { lamportsPerSignature: 5000 }
  }),
};

// Mock wallet for tests
const mockWallet = {
  publicKey: {
    toString: () => 'TestWallet123456789',
    toBase58: () => 'TestWallet123456789'
  },
  signTransaction: jest.fn(),
  signAllTransactions: jest.fn(),
  connected: true
};

module.exports = {
  setupTestDatabase,
  setupTestRedis,
  cleanupTestEnvironment,
  createTestUser,
  createTestTokenTransaction,
  createTestStakingPosition,
  createTestGovernanceProposal,
  createTestMarketplaceModel,
  mockSolanaConnection,
  mockWallet,
  testPool: () => testPool,
  testRedis: () => testRedis
};
