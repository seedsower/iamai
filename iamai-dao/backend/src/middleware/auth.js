const jwt = require('jsonwebtoken');
const { PublicKey } = require('@solana/web3.js');
const nacl = require('tweetnacl');
const bs58 = require('bs58');
const { getPool } = require('../config/database');
const logger = require('../utils/logger');

// JWT secret key (should be in environment variables)
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Verify Solana wallet signature
 */
const verifySignature = (message, signature, publicKey) => {
  try {
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = bs58.decode(signature);
    const publicKeyBytes = new PublicKey(publicKey).toBytes();
    
    return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
  } catch (error) {
    logger.error('Signature verification failed:', error);
    return false;
  }
};

/**
 * Generate authentication challenge
 */
const generateAuthChallenge = (walletAddress) => {
  const timestamp = Date.now();
  const nonce = Math.random().toString(36).substring(2, 15);
  return {
    message: `Sign this message to authenticate with IAMAI DAO.\n\nWallet: ${walletAddress}\nTimestamp: ${timestamp}\nNonce: ${nonce}`,
    timestamp,
    nonce
  };
};

/**
 * Authenticate user with wallet signature
 */
const authenticateWallet = async (req, res, next) => {
  try {
    const { walletAddress, signature, message, timestamp } = req.body;

    if (!walletAddress || !signature || !message || !timestamp) {
      return res.status(400).json({ 
        error: 'Missing authentication parameters' 
      });
    }

    // Validate wallet address format
    try {
      new PublicKey(walletAddress);
    } catch {
      return res.status(400).json({ error: 'Invalid wallet address format' });
    }

    // Check if message is not too old (5 minutes max)
    const messageAge = Date.now() - parseInt(timestamp);
    if (messageAge > 5 * 60 * 1000) {
      return res.status(401).json({ error: 'Authentication message expired' });
    }

    // Verify signature
    if (!verifySignature(message, signature, walletAddress)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Create or update user in database
    const pool = getPool();
    await pool.query(`
      INSERT INTO users (wallet_address, last_login)
      VALUES ($1, CURRENT_TIMESTAMP)
      ON CONFLICT (wallet_address) 
      DO UPDATE SET last_login = CURRENT_TIMESTAMP
    `, [walletAddress]);

    // Generate JWT token
    const token = jwt.sign(
      { 
        walletAddress,
        timestamp: Date.now()
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    logger.info(`User authenticated: ${walletAddress}`);

    res.json({
      success: true,
      token,
      walletAddress,
      expiresIn: JWT_EXPIRES_IN
    });

  } catch (error) {
    logger.error('Authentication failed:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

/**
 * Middleware to verify JWT token
 */
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Validate wallet address from token
      try {
        new PublicKey(decoded.walletAddress);
      } catch {
        return res.status(401).json({ error: 'Invalid token payload' });
      }

      // Check if user exists in database
      const pool = getPool();
      const userResult = await pool.query(`
        SELECT wallet_address, username, created_at, last_login
        FROM users 
        WHERE wallet_address = $1
      `, [decoded.walletAddress]);

      if (userResult.rows.length === 0) {
        return res.status(401).json({ error: 'User not found' });
      }

      // Add user info to request
      req.user = {
        walletAddress: decoded.walletAddress,
        username: userResult.rows[0].username,
        createdAt: userResult.rows[0].created_at,
        lastLogin: userResult.rows[0].last_login
      };

      next();
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired' });
      } else if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Invalid token' });
      } else {
        throw jwtError;
      }
    }

  } catch (error) {
    logger.error('Token verification failed:', error);
    res.status(500).json({ error: 'Token verification failed' });
  }
};

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Continue without authentication
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Validate and add user info if token is valid
      const pool = getPool();
      const userResult = await pool.query(`
        SELECT wallet_address, username, created_at, last_login
        FROM users 
        WHERE wallet_address = $1
      `, [decoded.walletAddress]);

      if (userResult.rows.length > 0) {
        req.user = {
          walletAddress: decoded.walletAddress,
          username: userResult.rows[0].username,
          createdAt: userResult.rows[0].created_at,
          lastLogin: userResult.rows[0].last_login
        };
      }
    } catch (jwtError) {
      // Ignore JWT errors for optional auth
      logger.debug('Optional auth failed:', jwtError.message);
    }

    next();
  } catch (error) {
    logger.error('Optional auth middleware error:', error);
    next(); // Continue even if there's an error
  }
};

/**
 * Role-based authorization middleware
 */
const requireRole = (requiredRole) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // For now, all authenticated users have 'user' role
      // In the future, this could check against a roles table
      const userRole = 'user';

      const roleHierarchy = {
        'user': 1,
        'moderator': 2,
        'admin': 3
      };

      const userLevel = roleHierarchy[userRole] || 0;
      const requiredLevel = roleHierarchy[requiredRole] || 0;

      if (userLevel < requiredLevel) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      req.userRole = userRole;
      next();
    } catch (error) {
      logger.error('Role authorization failed:', error);
      res.status(500).json({ error: 'Authorization failed' });
    }
  };
};

/**
 * Check if user owns a specific wallet address
 */
const requireWalletOwnership = (walletAddressField = 'walletAddress') => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const targetWallet = req.params[walletAddressField] || req.body[walletAddressField];
      
      if (!targetWallet) {
        return res.status(400).json({ error: 'Wallet address not provided' });
      }

      if (req.user.walletAddress !== targetWallet) {
        return res.status(403).json({ error: 'Access denied: wallet ownership required' });
      }

      next();
    } catch (error) {
      logger.error('Wallet ownership check failed:', error);
      res.status(500).json({ error: 'Ownership verification failed' });
    }
  };
};

module.exports = {
  generateAuthChallenge,
  authenticateWallet,
  verifyToken,
  optionalAuth,
  requireRole,
  requireWalletOwnership,
  verifySignature
};
