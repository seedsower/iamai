const request = require('supertest');
const express = require('express');
const authRoutes = require('../../src/routes/auth');
const { setupTestDatabase, setupTestRedis, cleanupTestEnvironment, createTestUser } = require('../setup');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Auth Routes', () => {
  beforeAll(async () => {
    await setupTestDatabase();
    await setupTestRedis();
  });

  afterAll(async () => {
    await cleanupTestEnvironment();
  });

  beforeEach(async () => {
    // Clear test data before each test
    const { testPool } = require('../setup');
    const pool = testPool();
    await pool.query('TRUNCATE TABLE users RESTART IDENTITY CASCADE');
  });

  describe('POST /api/auth/challenge', () => {
    it('should generate authentication challenge for valid wallet address', async () => {
      const walletAddress = 'TestWallet123456789';
      
      const response = await request(app)
        .post('/api/auth/challenge')
        .send({ walletAddress })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.challenge).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.nonce).toBeDefined();
      expect(response.body.challenge).toContain(walletAddress);
    });

    it('should reject invalid wallet address', async () => {
      const response = await request(app)
        .post('/api/auth/challenge')
        .send({ walletAddress: 'invalid_address' })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should reject missing wallet address', async () => {
      const response = await request(app)
        .post('/api/auth/challenge')
        .send({})
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/auth/authenticate', () => {
    it('should authenticate with valid signature', async () => {
      const walletAddress = 'TestWallet123456789';
      const message = `Sign this message to authenticate with IAMAI DAO.\n\nWallet: ${walletAddress}\nTimestamp: ${Date.now()}\nNonce: test123`;
      const signature = 'mock_signature_base58_encoded_string_for_testing_purposes_only';
      const timestamp = Date.now();

      // Mock signature verification for testing
      jest.mock('../../src/middleware/auth', () => ({
        ...jest.requireActual('../../src/middleware/auth'),
        verifySignature: jest.fn().mockReturnValue(true)
      }));

      const response = await request(app)
        .post('/api/auth/authenticate')
        .send({
          walletAddress,
          signature,
          message,
          timestamp
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.walletAddress).toBe(walletAddress);
    });

    it('should reject expired message', async () => {
      const walletAddress = 'TestWallet123456789';
      const oldTimestamp = Date.now() - (10 * 60 * 1000); // 10 minutes ago
      const message = `Sign this message to authenticate with IAMAI DAO.\n\nWallet: ${walletAddress}\nTimestamp: ${oldTimestamp}\nNonce: test123`;
      const signature = 'mock_signature';

      const response = await request(app)
        .post('/api/auth/authenticate')
        .send({
          walletAddress,
          signature,
          message,
          timestamp: oldTimestamp
        })
        .expect(401);

      expect(response.body.error).toContain('expired');
    });

    it('should reject missing parameters', async () => {
      const response = await request(app)
        .post('/api/auth/authenticate')
        .send({
          walletAddress: 'TestWallet123456789'
          // Missing signature, message, timestamp
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/auth/verify', () => {
    let authToken;

    beforeEach(async () => {
      // Create test user and generate token
      const user = await createTestUser();
      const jwt = require('jsonwebtoken');
      const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
      
      authToken = jwt.sign(
        { 
          walletAddress: user.wallet_address,
          timestamp: Date.now()
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
    });

    it('should verify valid token', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.valid).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.walletAddress).toBeDefined();
    });

    it('should reject missing token', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .expect(401);

      expect(response.body.error).toContain('No token provided');
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);

      expect(response.body.error).toContain('Invalid token');
    });
  });

  describe('POST /api/auth/refresh', () => {
    let validToken;

    beforeEach(async () => {
      const user = await createTestUser();
      const jwt = require('jsonwebtoken');
      const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
      
      validToken = jwt.sign(
        { 
          walletAddress: user.wallet_address,
          timestamp: Date.now()
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
    });

    it('should refresh valid token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ token: validToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.token).not.toBe(validToken); // Should be a new token
    });

    it('should reject missing token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({})
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ token: 'invalid_token' })
        .expect(401);

      expect(response.body.error).toContain('Invalid token');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Logged out successfully');
    });
  });
});
