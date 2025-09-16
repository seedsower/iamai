const express = require('express');
const { getPool } = require('../config/database');
const { setCache, getCache } = require('../config/redis');
const logger = require('../utils/logger');

const router = express.Router();

// Get Total Value Locked (TVL)
router.get('/tvl', async (req, res) => {
  try {
    const cachedTvl = await getCache('analytics_tvl');
    if (cachedTvl) {
      return res.json(cachedTvl);
    }

    const pool = getPool();
    
    // Calculate TVL from staking
    const stakingTvl = await pool.query(`
      SELECT COALESCE(SUM(amount), 0) as total_staked
      FROM staking_positions 
      WHERE status = 'active'
    `);

    // Calculate governance locked tokens (proposals require tokens)
    const governanceTvl = await pool.query(`
      SELECT COALESCE(SUM(voting_power), 0) as governance_locked
      FROM governance_votes gv
      JOIN governance_proposals gp ON gv.proposal_id = gp.id
      WHERE gp.status = 'active'
    `);

    const tokenPrice = 0.1; // $0.10 per token
    const totalStaked = parseInt(stakingTvl.rows[0].total_staked);
    const governanceLocked = parseInt(governanceTvl.rows[0].governance_locked);
    
    const tvlData = {
      totalStaked,
      governanceLocked,
      totalTvl: totalStaked + governanceLocked,
      tvlUsd: ((totalStaked + governanceLocked) / 1e9) * tokenPrice,
      stakingTvlUsd: (totalStaked / 1e9) * tokenPrice,
      governanceTvlUsd: (governanceLocked / 1e9) * tokenPrice,
      tokenPrice,
      lastUpdated: new Date().toISOString()
    };

    await setCache('analytics_tvl', tvlData, 300); // Cache for 5 minutes
    res.json(tvlData);
  } catch (error) {
    logger.error('Error fetching TVL:', error);
    res.status(500).json({ error: 'Failed to fetch TVL data' });
  }
});

// Get trading volume
router.get('/volume', async (req, res) => {
  try {
    const { period = '24h' } = req.query;
    const cacheKey = `analytics_volume_${period}`;
    
    const cachedVolume = await getCache(cacheKey);
    if (cachedVolume) {
      return res.json(cachedVolume);
    }

    const pool = getPool();
    let timeFilter = '';
    
    switch (period) {
      case '1h':
        timeFilter = "created_at >= NOW() - INTERVAL '1 hour'";
        break;
      case '24h':
        timeFilter = "created_at >= NOW() - INTERVAL '24 hours'";
        break;
      case '7d':
        timeFilter = "created_at >= NOW() - INTERVAL '7 days'";
        break;
      case '30d':
        timeFilter = "created_at >= NOW() - INTERVAL '30 days'";
        break;
      default:
        timeFilter = "created_at >= NOW() - INTERVAL '24 hours'";
    }

    // Token trading volume
    const tokenVolume = await pool.query(`
      SELECT 
        COUNT(*) as transaction_count,
        COALESCE(SUM(amount), 0) as token_volume,
        COALESCE(SUM(sol_amount), 0) as sol_volume
      FROM token_transactions 
      WHERE status = 'confirmed' AND ${timeFilter}
    `);

    // Marketplace volume
    const marketplaceVolume = await pool.query(`
      SELECT 
        COUNT(*) as purchase_count,
        COALESCE(SUM(price_paid), 0) as marketplace_volume
      FROM model_purchases 
      WHERE ${timeFilter}
    `);

    const volumeData = {
      period,
      tokenTransactions: parseInt(tokenVolume.rows[0].transaction_count),
      tokenVolume: parseInt(tokenVolume.rows[0].token_volume),
      solVolume: parseFloat(tokenVolume.rows[0].sol_volume),
      marketplacePurchases: parseInt(marketplaceVolume.rows[0].purchase_count),
      marketplaceVolume: parseInt(marketplaceVolume.rows[0].marketplace_volume),
      totalVolumeTokens: parseInt(tokenVolume.rows[0].token_volume) + parseInt(marketplaceVolume.rows[0].marketplace_volume),
      lastUpdated: new Date().toISOString()
    };

    await setCache(cacheKey, volumeData, 300); // Cache for 5 minutes
    res.json(volumeData);
  } catch (error) {
    logger.error('Error fetching volume:', error);
    res.status(500).json({ error: 'Failed to fetch volume data' });
  }
});

// Get user statistics
router.get('/user-stats', async (req, res) => {
  try {
    const cachedStats = await getCache('analytics_user_stats');
    if (cachedStats) {
      return res.json(cachedStats);
    }

    const pool = getPool();
    
    // Active users (users with transactions in last 30 days)
    const activeUsers = await pool.query(`
      SELECT COUNT(DISTINCT wallet_address) as count
      FROM token_transactions 
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `);

    // New users (first transaction in last 30 days)
    const newUsers = await pool.query(`
      SELECT COUNT(*) as count
      FROM (
        SELECT wallet_address, MIN(created_at) as first_tx
        FROM token_transactions
        GROUP BY wallet_address
        HAVING MIN(created_at) >= NOW() - INTERVAL '30 days'
      ) new_user_stats
    `);

    // Staking participation
    const stakingUsers = await pool.query(`
      SELECT COUNT(DISTINCT wallet_address) as count
      FROM staking_positions
      WHERE status = 'active'
    `);

    // Governance participation
    const governanceUsers = await pool.query(`
      SELECT COUNT(DISTINCT voter_address) as count
      FROM governance_votes
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `);

    // Marketplace users
    const marketplaceCreators = await pool.query(`
      SELECT COUNT(DISTINCT creator_address) as creators
      FROM marketplace_models
      WHERE is_active = true
    `);

    const marketplaceBuyers = await pool.query(`
      SELECT COUNT(DISTINCT buyer_address) as buyers
      FROM model_purchases
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `);

    const userStats = {
      activeUsers30d: parseInt(activeUsers.rows[0].count),
      newUsers30d: parseInt(newUsers.rows[0].count),
      stakingUsers: parseInt(stakingUsers.rows[0].count),
      governanceUsers30d: parseInt(governanceUsers.rows[0].count),
      marketplaceCreators: parseInt(marketplaceCreators.rows[0].creators),
      marketplaceBuyers30d: parseInt(marketplaceBuyers.rows[0].buyers),
      lastUpdated: new Date().toISOString()
    };

    await setCache('analytics_user_stats', userStats, 600); // Cache for 10 minutes
    res.json(userStats);
  } catch (error) {
    logger.error('Error fetching user stats:', error);
    res.status(500).json({ error: 'Failed to fetch user statistics' });
  }
});

// Get historical data
router.get('/historical', async (req, res) => {
  try {
    const { metric = 'tvl', period = '7d' } = req.query;
    const cacheKey = `analytics_historical_${metric}_${period}`;
    
    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    const pool = getPool();
    let interval = '1 day';
    let dateFormat = 'YYYY-MM-DD';
    
    switch (period) {
      case '24h':
        interval = '1 hour';
        dateFormat = 'YYYY-MM-DD HH24:00:00';
        break;
      case '7d':
        interval = '1 day';
        dateFormat = 'YYYY-MM-DD';
        break;
      case '30d':
        interval = '1 day';
        dateFormat = 'YYYY-MM-DD';
        break;
      case '90d':
        interval = '1 week';
        dateFormat = 'YYYY-"W"WW';
        break;
    }

    let query = '';
    
    switch (metric) {
      case 'tvl':
        query = `
          SELECT 
            DATE_TRUNC('${interval}', created_at) as date,
            SUM(amount) as value
          FROM staking_positions
          WHERE created_at >= NOW() - INTERVAL '${period.replace('d', ' days').replace('h', ' hours')}'
          GROUP BY DATE_TRUNC('${interval}', created_at)
          ORDER BY date
        `;
        break;
      case 'volume':
        query = `
          SELECT 
            DATE_TRUNC('${interval}', created_at) as date,
            SUM(amount) as value
          FROM token_transactions
          WHERE status = 'confirmed' 
            AND created_at >= NOW() - INTERVAL '${period.replace('d', ' days').replace('h', ' hours')}'
          GROUP BY DATE_TRUNC('${interval}', created_at)
          ORDER BY date
        `;
        break;
      case 'users':
        query = `
          SELECT 
            DATE_TRUNC('${interval}', created_at) as date,
            COUNT(DISTINCT wallet_address) as value
          FROM token_transactions
          WHERE created_at >= NOW() - INTERVAL '${period.replace('d', ' days').replace('h', ' hours')}'
          GROUP BY DATE_TRUNC('${interval}', created_at)
          ORDER BY date
        `;
        break;
      default:
        return res.status(400).json({ error: 'Invalid metric' });
    }

    const result = await pool.query(query);
    
    const historicalData = {
      metric,
      period,
      data: result.rows.map(row => ({
        date: row.date,
        value: parseInt(row.value) || 0
      })),
      lastUpdated: new Date().toISOString()
    };

    await setCache(cacheKey, historicalData, 600); // Cache for 10 minutes
    res.json(historicalData);
  } catch (error) {
    logger.error('Error fetching historical data:', error);
    res.status(500).json({ error: 'Failed to fetch historical data' });
  }
});

// Get platform overview
router.get('/overview', async (req, res) => {
  try {
    const cachedOverview = await getCache('analytics_overview');
    if (cachedOverview) {
      return res.json(cachedOverview);
    }

    const pool = getPool();
    
    // Get all key metrics
    const [
      tokenStats,
      stakingStats,
      governanceStats,
      marketplaceStats,
      userStats
    ] = await Promise.all([
      pool.query(`
        SELECT 
          COUNT(*) as total_transactions,
          COALESCE(SUM(amount), 0) as total_volume,
          COUNT(DISTINCT wallet_address) as unique_holders
        FROM token_transactions 
        WHERE status = 'confirmed'
      `),
      pool.query(`
        SELECT 
          COUNT(*) as total_positions,
          COALESCE(SUM(amount), 0) as total_staked,
          COUNT(DISTINCT wallet_address) as unique_stakers
        FROM staking_positions
      `),
      pool.query(`
        SELECT 
          COUNT(*) as total_proposals,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_proposals,
          (SELECT COUNT(*) FROM governance_votes) as total_votes
        FROM governance_proposals
      `),
      pool.query(`
        SELECT 
          COUNT(*) as total_models,
          COALESCE(SUM(sales_count), 0) as total_sales,
          COALESCE(SUM(total_revenue), 0) as total_revenue
        FROM marketplace_models
      `),
      pool.query(`
        SELECT COUNT(DISTINCT wallet_address) as total_users
        FROM token_transactions
      `)
    ]);

    const overview = {
      platform: {
        totalUsers: parseInt(userStats.rows[0].total_users),
        totalTransactions: parseInt(tokenStats.rows[0].total_transactions),
        totalVolume: parseInt(tokenStats.rows[0].total_volume),
        uniqueHolders: parseInt(tokenStats.rows[0].unique_holders)
      },
      staking: {
        totalPositions: parseInt(stakingStats.rows[0].total_positions),
        totalStaked: parseInt(stakingStats.rows[0].total_staked),
        uniqueStakers: parseInt(stakingStats.rows[0].unique_stakers)
      },
      governance: {
        totalProposals: parseInt(governanceStats.rows[0].total_proposals),
        activeProposals: parseInt(governanceStats.rows[0].active_proposals),
        totalVotes: parseInt(governanceStats.rows[0].total_votes)
      },
      marketplace: {
        totalModels: parseInt(marketplaceStats.rows[0].total_models),
        totalSales: parseInt(marketplaceStats.rows[0].total_sales),
        totalRevenue: parseInt(marketplaceStats.rows[0].total_revenue)
      },
      lastUpdated: new Date().toISOString()
    };

    await setCache('analytics_overview', overview, 300); // Cache for 5 minutes
    res.json(overview);
  } catch (error) {
    logger.error('Error fetching overview:', error);
    res.status(500).json({ error: 'Failed to fetch platform overview' });
  }
});

module.exports = router;
