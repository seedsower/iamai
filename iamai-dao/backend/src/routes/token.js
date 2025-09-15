const express = require('express');
const { body, validationResult } = require('express-validator');
const { Connection, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const { getAssociatedTokenAddress, getAccount } = require('@solana/spl-token');
const { getPool } = require('../config/database');
const { setCache, getCache } = require('../config/redis');
const logger = require('../utils/logger');

const router = express.Router();

// Solana connection
const connection = new Connection(
  process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
  'confirmed'
);

// Token configuration
const TOKEN_MINT = process.env.IAMAI_TOKEN_MINT || '';
const TOKEN_DECIMALS = 9;

// Get token price
router.get('/price', async (req, res) => {
  try {
    // Check cache first
    const cachedPrice = await getCache('token_price');
    if (cachedPrice) {
      return res.json(cachedPrice);
    }

    // Mock price data - in production, this would fetch from an oracle or DEX
    const priceData = {
      price: 0.1, // $0.10 per token
      priceChange24h: 5.2,
      volume24h: 125000,
      marketCap: 10000000,
      circulatingSupply: 750000000,
      totalSupply: 1000000000,
      lastUpdated: new Date().toISOString()
    };

    // Cache for 1 minute
    await setCache('token_price', priceData, 60);
    
    res.json(priceData);
  } catch (error) {
    logger.error('Error fetching token price:', error);
    res.status(500).json({ error: 'Failed to fetch token price' });
  }
});

// Get token metrics
router.get('/metrics', async (req, res) => {
  try {
    const cachedMetrics = await getCache('token_metrics');
    if (cachedMetrics) {
      return res.json(cachedMetrics);
    }

    const pool = getPool();
    
    // Get transaction stats
    const transactionStats = await pool.query(`
      SELECT 
        COUNT(*) as total_transactions,
        SUM(CASE WHEN transaction_type = 'purchase' THEN amount ELSE 0 END) as total_purchased,
        COUNT(DISTINCT wallet_address) as unique_holders
      FROM token_transactions 
      WHERE status = 'confirmed'
    `);

    const metrics = {
      totalTransactions: parseInt(transactionStats.rows[0].total_transactions),
      totalPurchased: parseInt(transactionStats.rows[0].total_purchased),
      uniqueHolders: parseInt(transactionStats.rows[0].unique_holders),
      circulatingSupply: 750000000,
      totalSupply: 1000000000,
      burnedTokens: 0,
      lastUpdated: new Date().toISOString()
    };

    await setCache('token_metrics', metrics, 300); // Cache for 5 minutes
    res.json(metrics);
  } catch (error) {
    logger.error('Error fetching token metrics:', error);
    res.status(500).json({ error: 'Failed to fetch token metrics' });
  }
});

// Get holder information
router.get('/holders/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    // Validate Solana address
    try {
      new PublicKey(address);
    } catch {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const pool = getPool();
    
    // Get holder transactions
    const transactions = await pool.query(`
      SELECT 
        transaction_hash,
        transaction_type,
        amount,
        sol_amount,
        price_per_token,
        status,
        created_at
      FROM token_transactions 
      WHERE wallet_address = $1 
      ORDER BY created_at DESC 
      LIMIT 50
    `, [address]);

    // Calculate total balance from transactions
    let balance = 0;
    transactions.rows.forEach(tx => {
      if (tx.status === 'confirmed') {
        if (tx.transaction_type === 'purchase') {
          balance += parseInt(tx.amount);
        } else if (tx.transaction_type === 'transfer' || tx.transaction_type === 'burn') {
          balance -= parseInt(tx.amount);
        }
      }
    });

    const holderInfo = {
      address,
      balance: balance,
      balanceFormatted: (balance / Math.pow(10, TOKEN_DECIMALS)).toFixed(2),
      transactionCount: transactions.rows.length,
      transactions: transactions.rows.map(tx => ({
        hash: tx.transaction_hash,
        type: tx.transaction_type,
        amount: tx.amount,
        amountFormatted: (parseInt(tx.amount) / Math.pow(10, TOKEN_DECIMALS)).toFixed(2),
        solAmount: tx.sol_amount,
        pricePerToken: tx.price_per_token,
        status: tx.status,
        timestamp: tx.created_at
      }))
    };

    res.json(holderInfo);
  } catch (error) {
    logger.error('Error fetching holder info:', error);
    res.status(500).json({ error: 'Failed to fetch holder information' });
  }
});

// Purchase tokens
router.post('/purchase', [
  body('wallet').isString().isLength({ min: 32, max: 44 }).withMessage('Invalid wallet address'),
  body('solAmount').isFloat({ min: 0.01 }).withMessage('SOL amount must be at least 0.01'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { wallet, solAmount } = req.body;
    
    // Validate wallet address
    let walletPubkey;
    try {
      walletPubkey = new PublicKey(wallet);
    } catch {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    // Get current token price
    const priceData = await getCache('token_price') || { price: 0.1 };
    const solPrice = 100; // Mock SOL price
    
    const tokenAmount = Math.floor((solAmount * solPrice / priceData.price) * Math.pow(10, TOKEN_DECIMALS));
    
    // Create transaction record
    const pool = getPool();
    const transactionHash = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const result = await pool.query(`
      INSERT INTO token_transactions 
      (wallet_address, transaction_hash, transaction_type, amount, sol_amount, price_per_token, status)
      VALUES ($1, $2, 'purchase', $3, $4, $5, 'confirmed')
      RETURNING id
    `, [wallet, transactionHash, tokenAmount, solAmount, priceData.price]);

    // In a real implementation, this would interact with the Solana program
    logger.info(`Token purchase: ${wallet} bought ${tokenAmount} tokens for ${solAmount} SOL`);

    res.json({
      success: true,
      transactionId: result.rows[0].id,
      transactionHash,
      tokenAmount,
      tokenAmountFormatted: (tokenAmount / Math.pow(10, TOKEN_DECIMALS)).toFixed(2),
      solAmount,
      pricePerToken: priceData.price
    });
  } catch (error) {
    logger.error('Error processing token purchase:', error);
    res.status(500).json({ error: 'Failed to process token purchase' });
  }
});

// Get transaction history
router.get('/transactions', async (req, res) => {
  try {
    const { page = 1, limit = 20, type, status } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '';
    const queryParams = [];
    
    if (type) {
      whereClause += ' WHERE transaction_type = $1';
      queryParams.push(type);
    }
    
    if (status) {
      whereClause += whereClause ? ' AND status = $2' : ' WHERE status = $1';
      queryParams.push(status);
    }

    const pool = getPool();
    
    const transactions = await pool.query(`
      SELECT 
        id,
        wallet_address,
        transaction_hash,
        transaction_type,
        amount,
        sol_amount,
        price_per_token,
        status,
        created_at
      FROM token_transactions 
      ${whereClause}
      ORDER BY created_at DESC 
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `, [...queryParams, limit, offset]);

    const totalCount = await pool.query(`
      SELECT COUNT(*) FROM token_transactions ${whereClause}
    `, queryParams);

    res.json({
      transactions: transactions.rows.map(tx => ({
        id: tx.id,
        walletAddress: tx.wallet_address,
        hash: tx.transaction_hash,
        type: tx.transaction_type,
        amount: tx.amount,
        amountFormatted: (parseInt(tx.amount) / Math.pow(10, TOKEN_DECIMALS)).toFixed(2),
        solAmount: tx.sol_amount,
        pricePerToken: tx.price_per_token,
        status: tx.status,
        timestamp: tx.created_at
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(totalCount.rows[0].count),
        pages: Math.ceil(totalCount.rows[0].count / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

module.exports = router;
