const express = require('express');
const { body, validationResult } = require('express-validator');
const { PublicKey } = require('@solana/web3.js');
const { getPool } = require('../config/database');
const { setCache, getCache, deleteCache } = require('../config/redis');
const logger = require('../utils/logger');

const router = express.Router();

// Governance configuration
const MIN_TOKENS_FOR_PROPOSAL = 10000;
const QUORUM_PERCENTAGE = 10;
const VOTING_PERIOD_DAYS = 7;

// Get all proposals
router.get('/proposals', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, type } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '';
    const queryParams = [];
    
    if (status) {
      whereClause += ' WHERE status = $1';
      queryParams.push(status);
    }
    
    if (type) {
      whereClause += whereClause ? ' AND proposal_type = $2' : ' WHERE proposal_type = $1';
      queryParams.push(type);
    }

    const pool = getPool();
    
    const proposals = await pool.query(`
      SELECT 
        id,
        proposer_address,
        title,
        description,
        proposal_type,
        votes_for,
        votes_against,
        total_votes,
        quorum_required,
        start_time,
        end_time,
        execution_time,
        status,
        created_at
      FROM governance_proposals 
      ${whereClause}
      ORDER BY created_at DESC 
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `, [...queryParams, limit, offset]);

    const totalCount = await pool.query(`
      SELECT COUNT(*) FROM governance_proposals ${whereClause}
    `, queryParams);

    res.json({
      proposals: proposals.rows.map(proposal => ({
        id: proposal.id,
        proposer: proposal.proposer_address,
        title: proposal.title,
        description: proposal.description,
        type: proposal.proposal_type,
        votesFor: parseInt(proposal.votes_for),
        votesAgainst: parseInt(proposal.votes_against),
        totalVotes: parseInt(proposal.total_votes),
        quorumRequired: parseInt(proposal.quorum_required),
        quorumReached: parseInt(proposal.total_votes) >= parseInt(proposal.quorum_required),
        startTime: proposal.start_time,
        endTime: proposal.end_time,
        executionTime: proposal.execution_time,
        status: proposal.status,
        createdAt: proposal.created_at
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(totalCount.rows[0].count),
        pages: Math.ceil(totalCount.rows[0].count / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching proposals:', error);
    res.status(500).json({ error: 'Failed to fetch proposals' });
  }
});

// Get voting power for an address
router.get('/voting-power/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    // Validate wallet address
    try {
      new PublicKey(address);
    } catch {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const pool = getPool();
    
    // Calculate voting power based on token balance and staking
    const tokenBalance = await pool.query(`
      SELECT COALESCE(SUM(
        CASE 
          WHEN transaction_type = 'purchase' THEN amount 
          WHEN transaction_type = 'transfer' AND wallet_address = $1 THEN -amount
          ELSE 0 
        END
      ), 0) as balance
      FROM token_transactions 
      WHERE (wallet_address = $1 OR (transaction_type = 'transfer' AND wallet_address = $1))
      AND status = 'confirmed'
    `, [address]);

    const stakingBalance = await pool.query(`
      SELECT COALESCE(SUM(amount), 0) as staked
      FROM staking_positions 
      WHERE wallet_address = $1 AND status = 'active'
    `, [address]);

    // Staked tokens get 1.5x voting power
    const baseVotingPower = parseInt(tokenBalance.rows[0].balance);
    const stakedVotingPower = Math.floor(parseInt(stakingBalance.rows[0].staked) * 1.5);
    const totalVotingPower = baseVotingPower + stakedVotingPower;

    res.json({
      address,
      tokenBalance: baseVotingPower,
      stakedBalance: parseInt(stakingBalance.rows[0].staked),
      votingPower: totalVotingPower,
      votingPowerFormatted: (totalVotingPower / 1e9).toFixed(2)
    });
  } catch (error) {
    logger.error('Error fetching voting power:', error);
    res.status(500).json({ error: 'Failed to fetch voting power' });
  }
});

// Create proposal
router.post('/create-proposal', [
  body('wallet').isString().isLength({ min: 32, max: 44 }).withMessage('Invalid wallet address'),
  body('title').isString().isLength({ min: 10, max: 200 }).withMessage('Title must be 10-200 characters'),
  body('description').isString().isLength({ min: 50, max: 2000 }).withMessage('Description must be 50-2000 characters'),
  body('type').isIn(['treasury', 'technical', 'community']).withMessage('Invalid proposal type')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { wallet, title, description, type } = req.body;
    
    // Validate wallet address
    try {
      new PublicKey(wallet);
    } catch {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    // Check voting power
    const votingPowerResponse = await fetch(`${req.protocol}://${req.get('host')}/api/governance/voting-power/${wallet}`);
    const votingPowerData = await votingPowerResponse.json();
    
    if (votingPowerData.votingPower < MIN_TOKENS_FOR_PROPOSAL * 1e9) {
      return res.status(400).json({ 
        error: `Insufficient voting power. Minimum ${MIN_TOKENS_FOR_PROPOSAL} tokens required.` 
      });
    }

    const pool = getPool();
    const now = new Date();
    const endTime = new Date(now.getTime() + VOTING_PERIOD_DAYS * 24 * 60 * 60 * 1000);
    
    // Calculate quorum requirement (10% of total supply)
    const totalSupply = 1000000000; // 1B tokens
    const quorumRequired = Math.floor((totalSupply * QUORUM_PERCENTAGE / 100) * 1e9);
    
    const transactionHash = `proposal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const result = await pool.query(`
      INSERT INTO governance_proposals 
      (proposer_address, title, description, proposal_type, quorum_required, start_time, end_time, transaction_hash)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `, [wallet, title, description, type, quorumRequired, now, endTime, transactionHash]);

    logger.info(`Proposal created: ${wallet} created proposal "${title}"`);

    res.json({
      success: true,
      proposalId: result.rows[0].id,
      transactionHash,
      title,
      description,
      type,
      startTime: now,
      endTime,
      quorumRequired
    });
  } catch (error) {
    logger.error('Error creating proposal:', error);
    res.status(500).json({ error: 'Failed to create proposal' });
  }
});

// Vote on proposal
router.post('/vote', [
  body('wallet').isString().isLength({ min: 32, max: 44 }).withMessage('Invalid wallet address'),
  body('proposalId').isInt({ min: 1 }).withMessage('Invalid proposal ID'),
  body('support').isBoolean().withMessage('Support must be boolean'),
  body('votingPower').isInt({ min: 1 }).withMessage('Invalid voting power')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { wallet, proposalId, support, votingPower } = req.body;
    
    // Validate wallet address
    try {
      new PublicKey(wallet);
    } catch {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const pool = getPool();
    
    // Check if proposal exists and is active
    const proposal = await pool.query(`
      SELECT * FROM governance_proposals 
      WHERE id = $1 AND status = 'active'
    `, [proposalId]);

    if (proposal.rows.length === 0) {
      return res.status(404).json({ error: 'Proposal not found or not active' });
    }

    const prop = proposal.rows[0];
    const now = new Date();
    
    if (now < new Date(prop.start_time) || now > new Date(prop.end_time)) {
      return res.status(400).json({ error: 'Voting period has ended' });
    }

    // Check if user already voted
    const existingVote = await pool.query(`
      SELECT id FROM governance_votes 
      WHERE proposal_id = $1 AND voter_address = $2
    `, [proposalId, wallet]);

    if (existingVote.rows.length > 0) {
      return res.status(400).json({ error: 'Already voted on this proposal' });
    }

    // Verify voting power
    const votingPowerResponse = await fetch(`${req.protocol}://${req.get('host')}/api/governance/voting-power/${wallet}`);
    const votingPowerData = await votingPowerResponse.json();
    
    if (votingPower > votingPowerData.votingPower) {
      return res.status(400).json({ error: 'Insufficient voting power' });
    }

    const transactionHash = `vote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Record vote
    await pool.query(`
      INSERT INTO governance_votes 
      (proposal_id, voter_address, support, voting_power, transaction_hash)
      VALUES ($1, $2, $3, $4, $5)
    `, [proposalId, wallet, support, votingPower, transactionHash]);

    // Update proposal vote counts
    if (support) {
      await pool.query(`
        UPDATE governance_proposals 
        SET votes_for = votes_for + $1, total_votes = total_votes + $1
        WHERE id = $2
      `, [votingPower, proposalId]);
    } else {
      await pool.query(`
        UPDATE governance_proposals 
        SET votes_against = votes_against + $1, total_votes = total_votes + $1
        WHERE id = $2
      `, [votingPower, proposalId]);
    }

    logger.info(`Vote cast: ${wallet} voted ${support ? 'for' : 'against'} proposal ${proposalId}`);

    res.json({
      success: true,
      transactionHash,
      proposalId,
      support,
      votingPower
    });
  } catch (error) {
    logger.error('Error casting vote:', error);
    res.status(500).json({ error: 'Failed to cast vote' });
  }
});

// Get proposal results
router.get('/results/:proposalId', async (req, res) => {
  try {
    const { proposalId } = req.params;
    
    const pool = getPool();
    
    const proposal = await pool.query(`
      SELECT * FROM governance_proposals WHERE id = $1
    `, [proposalId]);

    if (proposal.rows.length === 0) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    const votes = await pool.query(`
      SELECT 
        voter_address,
        support,
        voting_power,
        created_at
      FROM governance_votes 
      WHERE proposal_id = $1
      ORDER BY created_at DESC
    `, [proposalId]);

    const prop = proposal.rows[0];
    const quorumReached = parseInt(prop.total_votes) >= parseInt(prop.quorum_required);
    const passed = quorumReached && parseInt(prop.votes_for) > parseInt(prop.votes_against);

    res.json({
      proposal: {
        id: prop.id,
        title: prop.title,
        description: prop.description,
        type: prop.proposal_type,
        proposer: prop.proposer_address,
        status: prop.status,
        startTime: prop.start_time,
        endTime: prop.end_time,
        executionTime: prop.execution_time
      },
      results: {
        votesFor: parseInt(prop.votes_for),
        votesAgainst: parseInt(prop.votes_against),
        totalVotes: parseInt(prop.total_votes),
        quorumRequired: parseInt(prop.quorum_required),
        quorumReached,
        passed,
        participationRate: (parseInt(prop.total_votes) / parseInt(prop.quorum_required) * QUORUM_PERCENTAGE).toFixed(2)
      },
      votes: votes.rows.map(vote => ({
        voter: vote.voter_address,
        support: vote.support,
        votingPower: parseInt(vote.voting_power),
        timestamp: vote.created_at
      }))
    });
  } catch (error) {
    logger.error('Error fetching proposal results:', error);
    res.status(500).json({ error: 'Failed to fetch proposal results' });
  }
});

// Get governance statistics
router.get('/stats', async (req, res) => {
  try {
    const cachedStats = await getCache('governance_stats');
    if (cachedStats) {
      return res.json(cachedStats);
    }

    const pool = getPool();
    
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_proposals,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_proposals,
        COUNT(CASE WHEN status = 'passed' THEN 1 END) as passed_proposals,
        COUNT(CASE WHEN status = 'executed' THEN 1 END) as executed_proposals,
        COUNT(DISTINCT proposer_address) as unique_proposers
      FROM governance_proposals
    `);

    const voteStats = await pool.query(`
      SELECT 
        COUNT(*) as total_votes,
        COUNT(DISTINCT voter_address) as unique_voters,
        COALESCE(SUM(voting_power), 0) as total_voting_power
      FROM governance_votes
    `);

    const typeStats = await pool.query(`
      SELECT 
        proposal_type,
        COUNT(*) as count
      FROM governance_proposals
      GROUP BY proposal_type
    `);

    const governanceStats = {
      totalProposals: parseInt(stats.rows[0].total_proposals),
      activeProposals: parseInt(stats.rows[0].active_proposals),
      passedProposals: parseInt(stats.rows[0].passed_proposals),
      executedProposals: parseInt(stats.rows[0].executed_proposals),
      uniqueProposers: parseInt(stats.rows[0].unique_proposers),
      totalVotes: parseInt(voteStats.rows[0].total_votes),
      uniqueVoters: parseInt(voteStats.rows[0].unique_voters),
      totalVotingPower: parseInt(voteStats.rows[0].total_voting_power),
      proposalsByType: typeStats.rows.reduce((acc, row) => {
        acc[row.proposal_type] = parseInt(row.count);
        return acc;
      }, {}),
      lastUpdated: new Date().toISOString()
    };

    await setCache('governance_stats', governanceStats, 300); // Cache for 5 minutes
    res.json(governanceStats);
  } catch (error) {
    logger.error('Error fetching governance stats:', error);
    res.status(500).json({ error: 'Failed to fetch governance statistics' });
  }
});

module.exports = router;
