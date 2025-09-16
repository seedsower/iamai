const request = require('supertest');
const express = require('express');
const stakingRoutes = require('../../src/routes/staking');
const { setupTestDatabase, setupTestRedis, cleanupTestEnvironment, createTestUser, createTestStakingPosition } = require('../setup');

const app = express();
app.use(express.json());
app.use('/api/staking', stakingRoutes);

describe('Staking Routes', () => {
  let testUser;

  beforeAll(async () => {
    await setupTestDatabase();
    await setupTestRedis();
  });

  afterAll(async () => {
    await cleanupTestEnvironment();
  });

  beforeEach(async () => {
    const { testPool } = require('../setup');
    const pool = testPool();
    await pool.query('TRUNCATE TABLE users, staking_positions RESTART IDENTITY CASCADE');
    testUser = await createTestUser();
  });

  describe('GET /api/staking/positions/:address', () => {
    beforeEach(async () => {
      await createTestStakingPosition(testUser.wallet_address, 1000000000);
      await createTestStakingPosition(testUser.wallet_address, 500000000);
    });

    it('should return user staking positions', async () => {
      const response = await request(app)
        .get(`/api/staking/positions/${testUser.wallet_address}`)
        .expect(200);

      expect(response.body.positions).toBeDefined();
      expect(Array.isArray(response.body.positions)).toBe(true);
      expect(response.body.totalStaked).toBeDefined();
      expect(response.body.totalRewards).toBeDefined();
      
      if (response.body.positions.length > 0) {
        const position = response.body.positions[0];
        expect(position.amount).toBeDefined();
        expect(position.tier).toBeDefined();
        expect(position.apy).toBeDefined();
        expect(position.status).toBeDefined();
      }
    });

    it('should return empty positions for new address', async () => {
      const response = await request(app)
        .get('/api/staking/positions/NewAddress123456789')
        .expect(200);

      expect(response.body.positions).toEqual([]);
      expect(response.body.totalStaked).toBe('0');
    });
  });

  describe('POST /api/staking/stake', () => {
    const validStakeData = {
      walletAddress: 'TestWallet123456789',
      amount: 1000000000,
      lockDuration: 30,
      transactionHash: 'stake_hash_' + Date.now()
    };

    it('should create new staking position', async () => {
      const response = await request(app)
        .post('/api/staking/stake')
        .send(validStakeData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.positionId).toBeDefined();
      expect(response.body.amount).toBe(validStakeData.amount);
      expect(response.body.tier).toBeDefined();
      expect(response.body.apy).toBeDefined();
    });

    it('should reject invalid amount', async () => {
      const invalidData = {
        ...validStakeData,
        amount: -100
      };

      const response = await request(app)
        .post('/api/staking/stake')
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should reject invalid lock duration', async () => {
      const invalidData = {
        ...validStakeData,
        lockDuration: 15 // Less than minimum 30 days
      };

      const response = await request(app)
        .post('/api/staking/stake')
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should calculate correct tier based on amount', async () => {
      const bronzeStake = {
        ...validStakeData,
        amount: 100000000, // 0.1 IAMAI
        transactionHash: 'bronze_' + Date.now()
      };

      const response = await request(app)
        .post('/api/staking/stake')
        .send(bronzeStake)
        .expect(200);

      expect(response.body.tier).toBe('bronze');
    });
  });

  describe('POST /api/staking/unstake', () => {
    let stakingPosition;

    beforeEach(async () => {
      stakingPosition = await createTestStakingPosition(testUser.wallet_address);
    });

    it('should unstake position successfully', async () => {
      const unstakeData = {
        walletAddress: testUser.wallet_address,
        positionId: stakingPosition.id,
        transactionHash: 'unstake_hash_' + Date.now()
      };

      const response = await request(app)
        .post('/api/staking/unstake')
        .send(unstakeData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.amount).toBeDefined();
      expect(response.body.penalty).toBeDefined();
      expect(response.body.netAmount).toBeDefined();
    });

    it('should reject unstaking non-existent position', async () => {
      const unstakeData = {
        walletAddress: testUser.wallet_address,
        positionId: 99999,
        transactionHash: 'unstake_hash_' + Date.now()
      };

      const response = await request(app)
        .post('/api/staking/unstake')
        .send(unstakeData)
        .expect(404);

      expect(response.body.error).toContain('not found');
    });

    it('should reject unstaking other user position', async () => {
      const unstakeData = {
        walletAddress: 'DifferentWallet123456789',
        positionId: stakingPosition.id,
        transactionHash: 'unstake_hash_' + Date.now()
      };

      const response = await request(app)
        .post('/api/staking/unstake')
        .send(unstakeData)
        .expect(403);

      expect(response.body.error).toContain('access denied');
    });
  });

  describe('POST /api/staking/claim-rewards', () => {
    let stakingPosition;

    beforeEach(async () => {
      stakingPosition = await createTestStakingPosition(testUser.wallet_address);
      
      // Update position to have some rewards
      const { testPool } = require('../setup');
      const pool = testPool();
      await pool.query(`
        UPDATE staking_positions 
        SET rewards_earned = 50000000, last_reward_calculation = CURRENT_TIMESTAMP - INTERVAL '1 day'
        WHERE id = $1
      `, [stakingPosition.id]);
    });

    it('should claim rewards successfully', async () => {
      const claimData = {
        walletAddress: testUser.wallet_address,
        positionId: stakingPosition.id,
        transactionHash: 'claim_hash_' + Date.now()
      };

      const response = await request(app)
        .post('/api/staking/claim-rewards')
        .send(claimData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.rewardsClaimed).toBeDefined();
      expect(response.body.rewardsClaimed).toBeGreaterThan(0);
    });

    it('should reject claiming from non-existent position', async () => {
      const claimData = {
        walletAddress: testUser.wallet_address,
        positionId: 99999,
        transactionHash: 'claim_hash_' + Date.now()
      };

      const response = await request(app)
        .post('/api/staking/claim-rewards')
        .send(claimData)
        .expect(404);

      expect(response.body.error).toContain('not found');
    });
  });

  describe('GET /api/staking/stats', () => {
    beforeEach(async () => {
      await createTestStakingPosition(testUser.wallet_address, 1000000000);
      await createTestStakingPosition('AnotherWallet123456789', 500000000);
    });

    it('should return staking statistics', async () => {
      const response = await request(app)
        .get('/api/staking/stats')
        .expect(200);

      expect(response.body.totalStaked).toBeDefined();
      expect(response.body.totalStakers).toBeDefined();
      expect(response.body.averageAPY).toBeDefined();
      expect(response.body.tierDistribution).toBeDefined();
      expect(response.body.totalRewardsPaid).toBeDefined();
    });
  });

  describe('GET /api/staking/rewards/:address', () => {
    beforeEach(async () => {
      const position = await createTestStakingPosition(testUser.wallet_address);
      
      // Add some rewards history
      const { testPool } = require('../setup');
      const pool = testPool();
      await pool.query(`
        UPDATE staking_positions 
        SET rewards_earned = 100000000
        WHERE id = $1
      `, [position.id]);
    });

    it('should calculate pending rewards', async () => {
      const response = await request(app)
        .get(`/api/staking/rewards/${testUser.wallet_address}`)
        .expect(200);

      expect(response.body.totalPendingRewards).toBeDefined();
      expect(response.body.totalClaimedRewards).toBeDefined();
      expect(response.body.positions).toBeDefined();
      expect(Array.isArray(response.body.positions)).toBe(true);
    });

    it('should return zero rewards for new address', async () => {
      const response = await request(app)
        .get('/api/staking/rewards/NewAddress123456789')
        .expect(200);

      expect(response.body.totalPendingRewards).toBe('0');
      expect(response.body.totalClaimedRewards).toBe('0');
    });
  });
});
