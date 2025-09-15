const express = require('express');
const { body, validationResult } = require('express-validator');
const { PublicKey } = require('@solana/web3.js');
const { getPool } = require('../config/database');
const { setCache, getCache, deleteCache } = require('../config/redis');
const logger = require('../utils/logger');

const router = express.Router();

// Get user profile
router.get('/profile/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    // Validate wallet address
    try {
      new PublicKey(address);
    } catch {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const pool = getPool();
    
    // Get or create user profile
    let user = await pool.query(`
      SELECT * FROM users WHERE wallet_address = $1
    `, [address]);

    if (user.rows.length === 0) {
      // Create new user profile
      await pool.query(`
        INSERT INTO users (wallet_address) VALUES ($1)
      `, [address]);
      
      user = await pool.query(`
        SELECT * FROM users WHERE wallet_address = $1
      `, [address]);
    }

    const userProfile = user.rows[0];

    // Get user statistics
    const [tokenStats, stakingStats, governanceStats, marketplaceStats] = await Promise.all([
      pool.query(`
        SELECT 
          COUNT(*) as transaction_count,
          COALESCE(SUM(CASE WHEN transaction_type = 'purchase' THEN amount ELSE 0 END), 0) as total_purchased
        FROM token_transactions 
        WHERE wallet_address = $1 AND status = 'confirmed'
      `, [address]),
      pool.query(`
        SELECT 
          COUNT(*) as position_count,
          COALESCE(SUM(amount), 0) as total_staked,
          COALESCE(SUM(rewards_earned), 0) as total_rewards
        FROM staking_positions 
        WHERE wallet_address = $1
      `, [address]),
      pool.query(`
        SELECT 
          COUNT(DISTINCT gp.id) as proposals_created,
          COUNT(DISTINCT gv.proposal_id) as votes_cast
        FROM governance_proposals gp
        FULL OUTER JOIN governance_votes gv ON gv.voter_address = $1
        WHERE gp.proposer_address = $1 OR gv.voter_address = $1
      `, [address]),
      pool.query(`
        SELECT 
          COUNT(DISTINCT mm.id) as models_created,
          COUNT(DISTINCT mp.model_id) as models_purchased,
          COALESCE(SUM(mm.total_revenue), 0) as creator_revenue
        FROM marketplace_models mm
        FULL OUTER JOIN model_purchases mp ON mp.buyer_address = $1
        WHERE mm.creator_address = $1 OR mp.buyer_address = $1
      `, [address])
    ]);

    res.json({
      profile: {
        walletAddress: userProfile.wallet_address,
        username: userProfile.username,
        email: userProfile.email,
        avatarUrl: userProfile.avatar_url,
        createdAt: userProfile.created_at,
        updatedAt: userProfile.updated_at
      },
      stats: {
        tokens: {
          transactionCount: parseInt(tokenStats.rows[0].transaction_count),
          totalPurchased: parseInt(tokenStats.rows[0].total_purchased)
        },
        staking: {
          positionCount: parseInt(stakingStats.rows[0].position_count),
          totalStaked: parseInt(stakingStats.rows[0].total_staked),
          totalRewards: parseInt(stakingStats.rows[0].total_rewards)
        },
        governance: {
          proposalsCreated: parseInt(governanceStats.rows[0].proposals_created) || 0,
          votesCast: parseInt(governanceStats.rows[0].votes_cast) || 0
        },
        marketplace: {
          modelsCreated: parseInt(marketplaceStats.rows[0].models_created) || 0,
          modelsPurchased: parseInt(marketplaceStats.rows[0].models_purchased) || 0,
          creatorRevenue: parseInt(marketplaceStats.rows[0].creator_revenue) || 0
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Update user profile
router.put('/profile/:address', [
  body('username').optional().isString().isLength({ min: 3, max: 50 }).withMessage('Username must be 3-50 characters'),
  body('email').optional().isEmail().withMessage('Invalid email address'),
  body('avatarUrl').optional().isURL().withMessage('Invalid avatar URL')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { address } = req.params;
    const { username, email, avatarUrl } = req.body;
    
    // Validate wallet address
    try {
      new PublicKey(address);
    } catch {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const pool = getPool();
    
    // Check if username is already taken
    if (username) {
      const existingUser = await pool.query(`
        SELECT id FROM users 
        WHERE username = $1 AND wallet_address != $2
      `, [username, address]);

      if (existingUser.rows.length > 0) {
        return res.status(400).json({ error: 'Username already taken' });
      }
    }

    // Update user profile
    const updateFields = [];
    const updateValues = [];
    let paramCount = 0;

    if (username !== undefined) {
      updateFields.push(`username = $${++paramCount}`);
      updateValues.push(username);
    }
    if (email !== undefined) {
      updateFields.push(`email = $${++paramCount}`);
      updateValues.push(email);
    }
    if (avatarUrl !== undefined) {
      updateFields.push(`avatar_url = $${++paramCount}`);
      updateValues.push(avatarUrl);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateValues.push(address);

    const result = await pool.query(`
      UPDATE users 
      SET ${updateFields.join(', ')}
      WHERE wallet_address = $${++paramCount}
      RETURNING *
    `, updateValues);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    logger.info(`User profile updated: ${address}`);

    res.json({
      success: true,
      profile: {
        walletAddress: result.rows[0].wallet_address,
        username: result.rows[0].username,
        email: result.rows[0].email,
        avatarUrl: result.rows[0].avatar_url,
        updatedAt: result.rows[0].updated_at
      }
    });
  } catch (error) {
    logger.error('Error updating user profile:', error);
    res.status(500).json({ error: 'Failed to update user profile' });
  }
});

// Get user activity feed
router.get('/activity/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    // Validate wallet address
    try {
      new PublicKey(address);
    } catch {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const pool = getPool();
    
    // Get combined activity from all tables
    const activities = await pool.query(`
      (
        SELECT 
          'token_transaction' as type,
          transaction_hash as reference,
          transaction_type as action,
          amount::text as details,
          created_at as timestamp
        FROM token_transactions 
        WHERE wallet_address = $1
      )
      UNION ALL
      (
        SELECT 
          'staking' as type,
          id::text as reference,
          CASE 
            WHEN status = 'active' THEN 'stake'
            WHEN status = 'unstaked' THEN 'unstake'
            ELSE 'claim_rewards'
          END as action,
          amount::text as details,
          created_at as timestamp
        FROM staking_positions 
        WHERE wallet_address = $1
      )
      UNION ALL
      (
        SELECT 
          'governance' as type,
          id::text as reference,
          'create_proposal' as action,
          title as details,
          created_at as timestamp
        FROM governance_proposals 
        WHERE proposer_address = $1
      )
      UNION ALL
      (
        SELECT 
          'governance' as type,
          proposal_id::text as reference,
          'vote' as action,
          CASE WHEN support THEN 'voted_for' ELSE 'voted_against' END as details,
          created_at as timestamp
        FROM governance_votes 
        WHERE voter_address = $1
      )
      UNION ALL
      (
        SELECT 
          'marketplace' as type,
          id::text as reference,
          'list_model' as action,
          title as details,
          created_at as timestamp
        FROM marketplace_models 
        WHERE creator_address = $1
      )
      UNION ALL
      (
        SELECT 
          'marketplace' as type,
          model_id::text as reference,
          'purchase_model' as action,
          price_paid::text as details,
          created_at as timestamp
        FROM model_purchases 
        WHERE buyer_address = $1
      )
      ORDER BY timestamp DESC
      LIMIT $2 OFFSET $3
    `, [address, limit, offset]);

    const totalCount = await pool.query(`
      SELECT COUNT(*) as total FROM (
        SELECT wallet_address FROM token_transactions WHERE wallet_address = $1
        UNION ALL
        SELECT wallet_address FROM staking_positions WHERE wallet_address = $1
        UNION ALL
        SELECT proposer_address FROM governance_proposals WHERE proposer_address = $1
        UNION ALL
        SELECT voter_address FROM governance_votes WHERE voter_address = $1
        UNION ALL
        SELECT creator_address FROM marketplace_models WHERE creator_address = $1
        UNION ALL
        SELECT buyer_address FROM model_purchases WHERE buyer_address = $1
      ) combined
    `, [address]);

    res.json({
      activities: activities.rows.map(activity => ({
        type: activity.type,
        reference: activity.reference,
        action: activity.action,
        details: activity.details,
        timestamp: activity.timestamp
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(totalCount.rows[0].total),
        pages: Math.ceil(totalCount.rows[0].total / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching user activity:', error);
    res.status(500).json({ error: 'Failed to fetch user activity' });
  }
});

// Get user leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const { type = 'staking', limit = 50 } = req.query;
    const cacheKey = `user_leaderboard_${type}_${limit}`;
    
    const cachedLeaderboard = await getCache(cacheKey);
    if (cachedLeaderboard) {
      return res.json(cachedLeaderboard);
    }

    const pool = getPool();
    let query = '';
    
    switch (type) {
      case 'staking':
        query = `
          SELECT 
            u.wallet_address,
            u.username,
            COALESCE(SUM(sp.amount), 0) as total_staked,
            COUNT(sp.id) as position_count
          FROM users u
          LEFT JOIN staking_positions sp ON u.wallet_address = sp.wallet_address AND sp.status = 'active'
          GROUP BY u.wallet_address, u.username
          HAVING COALESCE(SUM(sp.amount), 0) > 0
          ORDER BY total_staked DESC
          LIMIT $1
        `;
        break;
      case 'governance':
        query = `
          SELECT 
            u.wallet_address,
            u.username,
            COUNT(DISTINCT gp.id) as proposals_created,
            COUNT(DISTINCT gv.proposal_id) as votes_cast,
            (COUNT(DISTINCT gp.id) * 10 + COUNT(DISTINCT gv.proposal_id)) as governance_score
          FROM users u
          LEFT JOIN governance_proposals gp ON u.wallet_address = gp.proposer_address
          LEFT JOIN governance_votes gv ON u.wallet_address = gv.voter_address
          GROUP BY u.wallet_address, u.username
          HAVING (COUNT(DISTINCT gp.id) + COUNT(DISTINCT gv.proposal_id)) > 0
          ORDER BY governance_score DESC
          LIMIT $1
        `;
        break;
      case 'marketplace':
        query = `
          SELECT 
            u.wallet_address,
            u.username,
            COALESCE(SUM(mm.total_revenue), 0) as creator_revenue,
            COUNT(DISTINCT mm.id) as models_created,
            COUNT(DISTINCT mp.model_id) as models_purchased
          FROM users u
          LEFT JOIN marketplace_models mm ON u.wallet_address = mm.creator_address
          LEFT JOIN model_purchases mp ON u.wallet_address = mp.buyer_address
          GROUP BY u.wallet_address, u.username
          HAVING (COUNT(DISTINCT mm.id) + COUNT(DISTINCT mp.model_id)) > 0
          ORDER BY creator_revenue DESC
          LIMIT $1
        `;
        break;
      default:
        return res.status(400).json({ error: 'Invalid leaderboard type' });
    }

    const result = await pool.query(query, [limit]);
    
    const leaderboard = {
      type,
      users: result.rows.map((user, index) => ({
        rank: index + 1,
        walletAddress: user.wallet_address,
        username: user.username || `User ${user.wallet_address.slice(0, 8)}...`,
        ...user
      })),
      lastUpdated: new Date().toISOString()
    };

    await setCache(cacheKey, leaderboard, 600); // Cache for 10 minutes
    res.json(leaderboard);
  } catch (error) {
    logger.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

module.exports = router;
