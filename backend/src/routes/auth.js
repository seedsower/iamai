const express = require('express');
const { body, validationResult } = require('express-validator');
const { generateAuthChallenge, authenticateWallet } = require('../middleware/auth');
const { rateLimiters, validators, handleValidationErrors } = require('../middleware/security');
const logger = require('../utils/logger');

const router = express.Router();

// Apply auth-specific rate limiting
router.use(rateLimiters.auth);

// Generate authentication challenge
router.post('/challenge', [
  validators.walletAddress('walletAddress'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { walletAddress } = req.body;
    
    const challenge = generateAuthChallenge(walletAddress);
    
    // Store challenge temporarily (in production, use Redis with expiration)
    // For now, we'll include it in the response
    res.json({
      success: true,
      challenge: challenge.message,
      timestamp: challenge.timestamp,
      nonce: challenge.nonce
    });
    
    logger.info(`Authentication challenge generated for: ${walletAddress}`);
  } catch (error) {
    logger.error('Challenge generation failed:', error);
    res.status(500).json({ error: 'Failed to generate challenge' });
  }
});

// Authenticate with wallet signature
router.post('/authenticate', [
  validators.walletAddress('walletAddress'),
  body('signature').isString().isLength({ min: 80, max: 120 }).withMessage('Invalid signature format'),
  body('message').isString().isLength({ min: 50, max: 500 }).withMessage('Invalid message format'),
  body('timestamp').isNumeric().withMessage('Invalid timestamp'),
  handleValidationErrors
], authenticateWallet);

// Refresh token
router.post('/refresh', [
  body('token').isString().withMessage('Token is required'),
  handleValidationErrors
], async (req, res) => {
  try {
    const jwt = require('jsonwebtoken');
    const { getPool } = require('../config/database');
    
    const { token } = req.body;
    const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
    const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

    try {
      // Verify the existing token (even if expired)
      const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });
      
      // Check if token is not too old (max 7 days)
      const tokenAge = Date.now() - decoded.timestamp;
      if (tokenAge > 7 * 24 * 60 * 60 * 1000) {
        return res.status(401).json({ error: 'Token too old, please re-authenticate' });
      }

      // Verify user still exists
      const pool = getPool();
      const userResult = await pool.query(`
        SELECT wallet_address FROM users WHERE wallet_address = $1
      `, [decoded.walletAddress]);

      if (userResult.rows.length === 0) {
        return res.status(401).json({ error: 'User not found' });
      }

      // Generate new token
      const newToken = jwt.sign(
        { 
          walletAddress: decoded.walletAddress,
          timestamp: Date.now()
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      res.json({
        success: true,
        token: newToken,
        walletAddress: decoded.walletAddress,
        expiresIn: JWT_EXPIRES_IN
      });

      logger.info(`Token refreshed for: ${decoded.walletAddress}`);
    } catch (jwtError) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    logger.error('Token refresh failed:', error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

// Logout (invalidate token)
router.post('/logout', async (req, res) => {
  try {
    // In a production environment, you would add the token to a blacklist
    // For now, we'll just return success
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    logger.error('Logout failed:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Verify token endpoint
router.get('/verify', async (req, res) => {
  try {
    const jwt = require('jsonwebtoken');
    const { getPool } = require('../config/database');
    
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Verify user exists
      const pool = getPool();
      const userResult = await pool.query(`
        SELECT wallet_address, username, created_at, last_login
        FROM users 
        WHERE wallet_address = $1
      `, [decoded.walletAddress]);

      if (userResult.rows.length === 0) {
        return res.status(401).json({ error: 'User not found' });
      }

      const user = userResult.rows[0];
      
      res.json({
        valid: true,
        user: {
          walletAddress: user.wallet_address,
          username: user.username,
          createdAt: user.created_at,
          lastLogin: user.last_login
        }
      });
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired' });
      } else {
        return res.status(401).json({ error: 'Invalid token' });
      }
    }
  } catch (error) {
    logger.error('Token verification failed:', error);
    res.status(500).json({ error: 'Token verification failed' });
  }
});

module.exports = router;
