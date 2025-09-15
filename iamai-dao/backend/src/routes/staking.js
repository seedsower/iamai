const express = require('express');
const { body, validationResult } = require('express-validator');
const { PublicKey } = require('@solana/web3.js');
const { getPool } = require('../config/database');
const { setCache, getCache, deleteCache } = require('../config/redis');
const logger = require('../utils/logger');

const router = express.Router();

// Staking tiers configuration
const STAKING_TIERS = [
  { duration: 30, apy: 5.0 },
  { duration: 60, apy: 8.0 },
  { duration: 90, apy: 12.0 },
  { duration: 180, apy: 20.0 }
];

// Get staking positions for a wallet
router.get('/positions/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    // Validate wallet address
    try {
      new PublicKey(address);
    } catch {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const pool = getPool();
    
    const positions = await pool.query(`
      SELECT 
        id,
        amount,
        duration_days,
        apy_rate,
        start_date,
        end_date,
        rewards_earned,
        rewards_claimed,
        status,
        transaction_hash,
        created_at
      FROM staking_positions 
      WHERE wallet_address = $1 
      ORDER BY created_at DESC
    `, [address]);

    const totalStaked = await pool.query(`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM staking_positions 
      WHERE wallet_address = $1 AND status = 'active'
    `, [address]);

    const totalRewards = await pool.query(`
      SELECT COALESCE(SUM(rewards_earned), 0) as total 
      FROM staking_positions 
      WHERE wallet_address = $1
    `, [address]);

    // Calculate current rewards for active positions
    const activePositions = positions.rows.filter(p => p.status === 'active');
    let currentRewards = 0;

    activePositions.forEach(position => {
      const now = new Date();
      const startDate = new Date(position.start_date);
      const endDate = new Date(position.end_date);
      
      const stakingDuration = Math.min(now.getTime(), endDate.getTime()) - startDate.getTime();
      const annualMs = 365 * 24 * 60 * 60 * 1000;
      
      const earnedRewards = Math.floor(
        (position.amount * position.apy_rate * stakingDuration) / (100 * annualMs)
      );
      
      currentRewards += Math.max(0, earnedRewards - position.rewards_claimed);
    });

    res.json({
      positions: positions.rows.map(position => ({
        id: position.id,
        amount: position.amount,
        duration: position.duration_days,
        apy: position.apy_rate,
        startDate: position.start_date,
        endDate: position.end_date,
        rewards: position.rewards_earned,
        rewardsClaimed: position.rewards_claimed,
        status: position.status,
        transactionHash: position.transaction_hash
      })),
      totalStaked: parseInt(totalStaked.rows[0].total),
      totalRewards: parseInt(totalRewards.rows[0].total),
      currentRewards
    });
  } catch (error) {
    logger.error('Error fetching staking positions:', error);
    res.status(500).json({ error: 'Failed to fetch staking positions' });
  }
});

// Stake tokens
router.post('/stake', [
  body('wallet').isString().isLength({ min: 32, max: 44 }).withMessage('Invalid wallet address'),
  body('amount').isFloat({ min: 1 }).withMessage('Amount must be at least 1'),
  body('duration').isInt({ min: 30, max: 180 }).withMessage('Invalid duration'),
  body('apy').isFloat({ min: 0 }).withMessage('Invalid APY')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { wallet, amount, duration, apy } = req.body;
    
    // Validate wallet address
    try {
      new PublicKey(wallet);
    } catch {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    // Validate staking tier
    const tier = STAKING_TIERS.find(t => t.duration === duration && t.apy === apy);
    if (!tier) {
      return res.status(400).json({ error: 'Invalid staking tier' });
    }

    const pool = getPool();
    const now = new Date();
    const endDate = new Date(now.getTime() + duration * 24 * 60 * 60 * 1000);
    const transactionHash = `stake_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const result = await pool.query(`
      INSERT INTO staking_positions 
      (wallet_address, amount, duration_days, apy_rate, start_date, end_date, transaction_hash)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, [wallet, Math.floor(amount * 1e9), duration, apy, now, endDate, transactionHash]);

    // Clear cache for this wallet
    await deleteCache(`staking_positions_${wallet}`);

    logger.info(`Staking: ${wallet} staked ${amount} tokens for ${duration} days`);

    res.json({
      success: true,
      positionId: result.rows[0].id,
      transactionHash,
      amount,
      duration,
      apy,
      startDate: now,
      endDate
    });
  } catch (error) {
    logger.error('Error processing staking:', error);
    res.status(500).json({ error: 'Failed to process staking' });
  }
});

// Unstake tokens
router.post('/unstake', [
  body('wallet').isString().isLength({ min: 32, max: 44 }).withMessage('Invalid wallet address'),
  body('positionId').isInt({ min: 1 }).withMessage('Invalid position ID'),
  body('early').isBoolean().withMessage('Early flag must be boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { wallet, positionId, early } = req.body;
    
    // Validate wallet address
    try {
      new PublicKey(wallet);
    } catch {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const pool = getPool();
    
    // Get position details
    const position = await pool.query(`
      SELECT * FROM staking_positions 
      WHERE id = $1 AND wallet_address = $2 AND status = 'active'
    `, [positionId, wallet]);

    if (position.rows.length === 0) {
      return res.status(404).json({ error: 'Position not found or not active' });
    }

    const pos = position.rows[0];
    const now = new Date();
    const endDate = new Date(pos.end_date);
    
    // Check if early unstaking
    if (now < endDate && !early) {
      return res.status(400).json({ error: 'Position not matured. Set early=true for early unstaking' });
    }

    // Calculate rewards and penalties
    const startDate = new Date(pos.start_date);
    const stakingDuration = Math.min(now.getTime(), endDate.getTime()) - startDate.getTime();
    const annualMs = 365 * 24 * 60 * 60 * 1000;
    
    let earnedRewards = Math.floor(
      (pos.amount * pos.apy_rate * stakingDuration) / (100 * annualMs)
    );
    
    let penalty = 0;
    let amountToReturn = pos.amount;
    
    if (now < endDate) {
      // Early unstaking penalty (10%)
      penalty = Math.floor(pos.amount * 0.1);
      amountToReturn -= penalty;
    }

    const transactionHash = `unstake_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Update position
    await pool.query(`
      UPDATE staking_positions 
      SET status = 'unstaked', 
          rewards_earned = $1,
          rewards_claimed = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [earnedRewards, positionId]);

    // Clear cache
    await deleteCache(`staking_positions_${wallet}`);

    logger.info(`Unstaking: ${wallet} unstaked position ${positionId}, early: ${early}`);

    res.json({
      success: true,
      transactionHash,
      amountReturned: amountToReturn,
      rewards: earnedRewards,
      penalty,
      early
    });
  } catch (error) {
    logger.error('Error processing unstaking:', error);
    res.status(500).json({ error: 'Failed to process unstaking' });
  }
});

// Claim rewards
router.post('/claim-rewards', [
  body('wallet').isString().isLength({ min: 32, max: 44 }).withMessage('Invalid wallet address'),
  body('positionId').isInt({ min: 1 }).withMessage('Invalid position ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { wallet, positionId } = req.body;
    
    // Validate wallet address
    try {
      new PublicKey(wallet);
    } catch {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const pool = getPool();
    
    // Get position details
    const position = await pool.query(`
      SELECT * FROM staking_positions 
      WHERE id = $1 AND wallet_address = $2 AND status = 'active'
    `, [positionId, wallet]);

    if (position.rows.length === 0) {
      return res.status(404).json({ error: 'Position not found or not active' });
    }

    const pos = position.rows[0];
    const now = new Date();
    const startDate = new Date(pos.start_date);
    const endDate = new Date(pos.end_date);
    
    // Calculate available rewards
    const stakingDuration = Math.min(now.getTime(), endDate.getTime()) - startDate.getTime();
    const annualMs = 365 * 24 * 60 * 60 * 1000;
    
    const totalEarnedRewards = Math.floor(
      (pos.amount * pos.apy_rate * stakingDuration) / (100 * annualMs)
    );
    
    const availableRewards = totalEarnedRewards - pos.rewards_claimed;
    
    if (availableRewards <= 0) {
      return res.status(400).json({ error: 'No rewards available to claim' });
    }

    const transactionHash = `claim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Update position
    await pool.query(`
      UPDATE staking_positions 
      SET rewards_earned = $1,
          rewards_claimed = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [totalEarnedRewards, positionId]);

    // Clear cache
    await deleteCache(`staking_positions_${wallet}`);

    logger.info(`Rewards claimed: ${wallet} claimed ${availableRewards} from position ${positionId}`);

    res.json({
      success: true,
      transactionHash,
      rewardsClaimed: availableRewards,
      totalRewards: totalEarnedRewards
    });
  } catch (error) {
    logger.error('Error claiming rewards:', error);
    res.status(500).json({ error: 'Failed to claim rewards' });
  }
});

// Get staking statistics
router.get('/stats', async (req, res) => {
  try {
    const cachedStats = await getCache('staking_stats');
    if (cachedStats) {
      return res.json(cachedStats);
    }

    const pool = getPool();
    
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_positions,
        COUNT(DISTINCT wallet_address) as unique_stakers,
        COALESCE(SUM(CASE WHEN status = 'active' THEN amount ELSE 0 END), 0) as total_staked,
        COALESCE(SUM(rewards_earned), 0) as total_rewards_distributed,
        COALESCE(AVG(apy_rate), 0) as average_apy
      FROM staking_positions
    `);

    const tierStats = await pool.query(`
      SELECT 
        duration_days,
        COUNT(*) as position_count,
        COALESCE(SUM(amount), 0) as total_amount
      FROM staking_positions 
      WHERE status = 'active'
      GROUP BY duration_days
      ORDER BY duration_days
    `);

    const stakingStats = {
      totalPositions: parseInt(stats.rows[0].total_positions),
      uniqueStakers: parseInt(stats.rows[0].unique_stakers),
      totalStaked: parseInt(stats.rows[0].total_staked),
      totalRewardsDistributed: parseInt(stats.rows[0].total_rewards_distributed),
      averageApy: parseFloat(stats.rows[0].average_apy),
      tierBreakdown: tierStats.rows.map(tier => ({
        duration: tier.duration_days,
        positions: parseInt(tier.position_count),
        totalAmount: parseInt(tier.total_amount)
      })),
      lastUpdated: new Date().toISOString()
    };

    await setCache('staking_stats', stakingStats, 300); // Cache for 5 minutes
    res.json(stakingStats);
  } catch (error) {
    logger.error('Error fetching staking stats:', error);
    res.status(500).json({ error: 'Failed to fetch staking statistics' });
  }
});

module.exports = router;
