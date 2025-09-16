const rateLimit = require('express-rate-limit');
const { body, param, query, validationResult } = require('express-validator');
const { PublicKey } = require('@solana/web3.js');
const logger = require('../utils/logger');

// Rate limiting configurations
const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn(`Rate limit exceeded for IP: ${req.ip}, endpoint: ${req.path}`);
      res.status(429).json({ error: message });
    }
  });
};

// Different rate limits for different endpoints
const rateLimiters = {
  // General API rate limit
  general: createRateLimiter(15 * 60 * 1000, 100, 'Too many requests, please try again later'),
  
  // Authentication endpoints
  auth: createRateLimiter(15 * 60 * 1000, 10, 'Too many authentication attempts'),
  
  // File upload endpoints
  upload: createRateLimiter(60 * 60 * 1000, 20, 'Too many file uploads, please try again later'),
  
  // Transaction endpoints
  transaction: createRateLimiter(60 * 1000, 5, 'Too many transaction requests, please wait'),
  
  // Search endpoints
  search: createRateLimiter(60 * 1000, 30, 'Too many search requests, please slow down')
};

// Validation helpers
const validators = {
  // Solana wallet address validation
  walletAddress: (field = 'address') => {
    return body(field).custom((value) => {
      try {
        new PublicKey(value);
        return true;
      } catch {
        throw new Error('Invalid Solana wallet address');
      }
    });
  },

  // Solana transaction hash validation
  transactionHash: (field = 'hash') => {
    return body(field).isString().isLength({ min: 88, max: 88 }).withMessage('Invalid transaction hash format');
  },

  // Token amount validation
  tokenAmount: (field = 'amount') => {
    return body(field)
      .isNumeric()
      .custom((value) => {
        const amount = parseFloat(value);
        if (amount <= 0) {
          throw new Error('Amount must be greater than 0');
        }
        if (amount > 1000000000) { // 1 billion token limit
          throw new Error('Amount exceeds maximum limit');
        }
        return true;
      });
  },

  // Pagination validation
  pagination: () => {
    return [
      query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
      query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
    ];
  },

  // IPFS hash validation
  ipfsHash: (field = 'hash') => {
    return param(field).matches(/^Qm[1-9A-HJ-NP-Za-km-z]{44}$|^baf[a-z0-9]{56}$/).withMessage('Invalid IPFS hash format');
  },

  // Proposal validation
  proposal: () => {
    return [
      body('title').isString().isLength({ min: 10, max: 200 }).withMessage('Title must be 10-200 characters'),
      body('description').isString().isLength({ min: 50, max: 5000 }).withMessage('Description must be 50-5000 characters'),
      body('proposalType').isIn(['parameter', 'treasury', 'upgrade', 'general']).withMessage('Invalid proposal type')
    ];
  },

  // Model listing validation
  modelListing: () => {
    return [
      body('title').isString().isLength({ min: 5, max: 100 }).withMessage('Title must be 5-100 characters'),
      body('description').isString().isLength({ min: 20, max: 2000 }).withMessage('Description must be 20-2000 characters'),
      body('category').isIn(['nlp', 'computer-vision', 'audio', 'multimodal', 'other']).withMessage('Invalid category'),
      body('price').isNumeric().custom((value) => {
        const price = parseFloat(value);
        if (price < 0) throw new Error('Price cannot be negative');
        if (price > 1000000) throw new Error('Price exceeds maximum limit');
        return true;
      }),
      body('tags').optional().isArray({ max: 10 }).withMessage('Maximum 10 tags allowed'),
      body('tags.*').optional().isString().isLength({ min: 2, max: 30 }).withMessage('Each tag must be 2-30 characters')
    ];
  }
};

// Security middleware for sensitive operations
const securityChecks = {
  // Verify wallet ownership (placeholder - would need signature verification)
  verifyWalletOwnership: async (req, res, next) => {
    try {
      const { walletAddress, signature, message } = req.body;
      
      if (!walletAddress || !signature || !message) {
        return res.status(400).json({ error: 'Wallet verification required' });
      }

      // TODO: Implement actual signature verification
      // This would verify that the signature was created by the wallet owner
      // For now, we'll just validate the wallet address format
      try {
        new PublicKey(walletAddress);
      } catch {
        return res.status(400).json({ error: 'Invalid wallet address' });
      }

      req.verifiedWallet = walletAddress;
      next();
    } catch (error) {
      logger.error('Wallet verification failed:', error);
      res.status(401).json({ error: 'Wallet verification failed' });
    }
  },

  // Check if user has sufficient permissions
  checkPermissions: (requiredRole = 'user') => {
    return async (req, res, next) => {
      try {
        // For now, all verified wallets have user permissions
        // In the future, this could check against a roles table
        if (req.verifiedWallet) {
          req.userRole = 'user';
          next();
        } else {
          res.status(403).json({ error: 'Insufficient permissions' });
        }
      } catch (error) {
        logger.error('Permission check failed:', error);
        res.status(500).json({ error: 'Permission check failed' });
      }
    };
  },

  // Sanitize input data
  sanitizeInput: (req, res, next) => {
    try {
      // Remove potentially dangerous characters from string inputs
      const sanitizeString = (str) => {
        if (typeof str !== 'string') return str;
        return str
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
          .replace(/javascript:/gi, '') // Remove javascript: protocols
          .replace(/on\w+\s*=/gi, '') // Remove event handlers
          .trim();
      };

      const sanitizeObject = (obj) => {
        if (typeof obj !== 'object' || obj === null) return obj;
        
        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
          if (typeof value === 'string') {
            sanitized[key] = sanitizeString(value);
          } else if (typeof value === 'object') {
            sanitized[key] = sanitizeObject(value);
          } else {
            sanitized[key] = value;
          }
        }
        return sanitized;
      };

      req.body = sanitizeObject(req.body);
      req.query = sanitizeObject(req.query);
      
      next();
    } catch (error) {
      logger.error('Input sanitization failed:', error);
      res.status(500).json({ error: 'Input processing failed' });
    }
  }
};

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Validation errors:', { errors: errors.array(), ip: req.ip, path: req.path });
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Security headers middleware
const securityHeaders = (req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self' https:; " +
    "font-src 'self' https:; " +
    "object-src 'none'; " +
    "media-src 'self'; " +
    "frame-src 'none';"
  );

  next();
};

module.exports = {
  rateLimiters,
  validators,
  securityChecks,
  handleValidationErrors,
  securityHeaders
};
