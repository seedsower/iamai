const request = require('supertest');
const express = require('express');
const tokenRoutes = require('../../src/routes/token');
const { setupTestDatabase, setupTestRedis, cleanupTestEnvironment, createTestUser, createTestTokenTransaction } = require('../setup');

const app = express();
app.use(express.json());
app.use('/api/token', tokenRoutes);

describe('Token Routes', () => {
  let testUser;

  beforeAll(async () => {
    await setupTestDatabase();
    await setupTestRedis();
  });

  afterAll(async () => {
    await cleanupTestEnvironment();
  });

  beforeEach(async () => {
    // Clear test data and create fresh test user
    const { testPool } = require('../setup');
    const pool = testPool();
    await pool.query('TRUNCATE TABLE users, token_transactions RESTART IDENTITY CASCADE');
    testUser = await createTestUser();
  });

  describe('GET /api/token/price', () => {
    it('should return current token price', async () => {
      const response = await request(app)
        .get('/api/token/price')
        .expect(200);

      expect(response.body.price).toBeDefined();
      expect(response.body.currency).toBe('USD');
      expect(response.body.lastUpdated).toBeDefined();
      expect(typeof response.body.price).toBe('number');
      expect(response.body.price).toBeGreaterThan(0);
    });
  });

  describe('GET /api/token/metrics', () => {
    beforeEach(async () => {
      // Create some test transactions
      await createTestTokenTransaction(testUser.wallet_address, 1000000000);
      await createTestTokenTransaction(testUser.wallet_address, 500000000);
    });

    it('should return token metrics', async () => {
      const response = await request(app)
        .get('/api/token/metrics')
        .expect(200);

      expect(response.body.totalSupply).toBeDefined();
      expect(response.body.circulatingSupply).toBeDefined();
      expect(response.body.totalHolders).toBeDefined();
      expect(response.body.totalTransactions).toBeDefined();
      expect(response.body.volume24h).toBeDefined();
      expect(response.body.marketCap).toBeDefined();
    });
  });

  describe('GET /api/token/holders', () => {
    beforeEach(async () => {
      await createTestTokenTransaction(testUser.wallet_address, 1000000000);
    });

    it('should return token holders list', async () => {
      const response = await request(app)
        .get('/api/token/holders')
        .expect(200);

      expect(response.body.holders).toBeDefined();
      expect(Array.isArray(response.body.holders)).toBe(true);
      expect(response.body.pagination).toBeDefined();
      
      if (response.body.holders.length > 0) {
        const holder = response.body.holders[0];
        expect(holder.walletAddress).toBeDefined();
        expect(holder.balance).toBeDefined();
        expect(holder.percentage).toBeDefined();
      }
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/token/holders?page=1&limit=10')
        .expect(200);

      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(10);
    });
  });

  describe('POST /api/token/purchase', () => {
    const validPurchaseData = {
      walletAddress: 'TestWallet123456789',
      amount: 100,
      solAmount: 0.01,
      transactionHash: 'test_hash_' + Date.now()
    };

    it('should record token purchase', async () => {
      const response = await request(app)
        .post('/api/token/purchase')
        .send(validPurchaseData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.transactionId).toBeDefined();
      expect(response.body.amount).toBe(validPurchaseData.amount);
      expect(response.body.walletAddress).toBe(validPurchaseData.walletAddress);
    });

    it('should reject invalid wallet address', async () => {
      const invalidData = {
        ...validPurchaseData,
        walletAddress: 'invalid_address'
      };

      const response = await request(app)
        .post('/api/token/purchase')
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should reject negative amount', async () => {
      const invalidData = {
        ...validPurchaseData,
        amount: -100
      };

      const response = await request(app)
        .post('/api/token/purchase')
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should reject missing required fields', async () => {
      const response = await request(app)
        .post('/api/token/purchase')
        .send({
          walletAddress: validPurchaseData.walletAddress
          // Missing amount, solAmount, transactionHash
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should reject duplicate transaction hash', async () => {
      // First purchase
      await request(app)
        .post('/api/token/purchase')
        .send(validPurchaseData)
        .expect(200);

      // Duplicate purchase with same hash
      const response = await request(app)
        .post('/api/token/purchase')
        .send(validPurchaseData)
        .expect(400);

      expect(response.body.error).toContain('duplicate');
    });
  });

  describe('GET /api/token/transactions/:address', () => {
    beforeEach(async () => {
      await createTestTokenTransaction(testUser.wallet_address, 1000000000);
      await createTestTokenTransaction(testUser.wallet_address, 500000000);
    });

    it('should return user transaction history', async () => {
      const response = await request(app)
        .get(`/api/token/transactions/${testUser.wallet_address}`)
        .expect(200);

      expect(response.body.transactions).toBeDefined();
      expect(Array.isArray(response.body.transactions)).toBe(true);
      expect(response.body.pagination).toBeDefined();
      
      if (response.body.transactions.length > 0) {
        const transaction = response.body.transactions[0];
        expect(transaction.transactionHash).toBeDefined();
        expect(transaction.transactionType).toBeDefined();
        expect(transaction.amount).toBeDefined();
        expect(transaction.status).toBeDefined();
        expect(transaction.createdAt).toBeDefined();
      }
    });

    it('should return empty array for non-existent address', async () => {
      const response = await request(app)
        .get('/api/token/transactions/NonExistentAddress123')
        .expect(200);

      expect(response.body.transactions).toEqual([]);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get(`/api/token/transactions/${testUser.wallet_address}?page=1&limit=5`)
        .expect(200);

      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
    });

    it('should filter by transaction type', async () => {
      const response = await request(app)
        .get(`/api/token/transactions/${testUser.wallet_address}?type=purchase`)
        .expect(200);

      expect(response.body.transactions).toBeDefined();
      response.body.transactions.forEach(tx => {
        expect(tx.transactionType).toBe('purchase');
      });
    });
  });

  describe('GET /api/token/balance/:address', () => {
    beforeEach(async () => {
      await createTestTokenTransaction(testUser.wallet_address, 1000000000);
    });

    it('should return wallet token balance', async () => {
      const response = await request(app)
        .get(`/api/token/balance/${testUser.wallet_address}`)
        .expect(200);

      expect(response.body.walletAddress).toBe(testUser.wallet_address);
      expect(response.body.balance).toBeDefined();
      expect(response.body.balanceFormatted).toBeDefined();
      expect(typeof response.body.balance).toBe('string');
    });

    it('should return zero balance for new address', async () => {
      const response = await request(app)
        .get('/api/token/balance/NewAddress123456789')
        .expect(200);

      expect(response.body.balance).toBe('0');
    });

    it('should reject invalid wallet address format', async () => {
      const response = await request(app)
        .get('/api/token/balance/invalid_address')
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });
});
