const express = require('express');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const { create } = require('ipfs-http-client');
const { getPool } = require('../config/database');
const { setCache, getCache } = require('../config/redis');
const logger = require('../utils/logger');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow specific file types
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'application/json',
      'text/plain', 'text/markdown',
      'application/octet-stream' // For AI models
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});

// Initialize IPFS client
let ipfsClient;
try {
  const projectId = process.env.INFURA_PROJECT_ID;
  const projectSecret = process.env.INFURA_PROJECT_SECRET;
  
  if (projectId && projectSecret) {
    const auth = 'Basic ' + Buffer.from(projectId + ':' + projectSecret).toString('base64');
    ipfsClient = create({
      host: 'ipfs.infura.io',
      port: 5001,
      protocol: 'https',
      headers: {
        authorization: auth,
      },
    });
  } else {
    // Fallback to local IPFS node
    ipfsClient = create({
      host: 'localhost',
      port: 5001,
      protocol: 'http',
    });
  }
} catch (error) {
  logger.error('Failed to initialize IPFS client:', error);
}

// Upload single file to IPFS
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    if (!ipfsClient) {
      return res.status(503).json({ error: 'IPFS service unavailable' });
    }

    const { originalname, buffer, mimetype, size } = req.file;
    const { pin = true, metadata } = req.body;

    // Upload to IPFS
    const result = await ipfsClient.add({
      path: originalname,
      content: buffer,
    });

    const hash = result.cid.toString();

    // Pin the content if requested
    if (pin) {
      await ipfsClient.pin.add(hash);
    }

    // Store file info in database
    const pool = getPool();
    await pool.query(`
      INSERT INTO ipfs_files (hash, filename, mimetype, size, metadata, pinned)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (hash) DO UPDATE SET
        filename = EXCLUDED.filename,
        mimetype = EXCLUDED.mimetype,
        size = EXCLUDED.size,
        metadata = EXCLUDED.metadata,
        pinned = EXCLUDED.pinned,
        updated_at = CURRENT_TIMESTAMP
    `, [hash, originalname, mimetype, size, metadata || null, pin]);

    logger.info(`File uploaded to IPFS: ${hash}`);

    res.json({
      success: true,
      hash,
      filename: originalname,
      size,
      mimetype,
      gatewayUrl: `https://ipfs.io/ipfs/${hash}`,
      pinned: pin
    });
  } catch (error) {
    logger.error('IPFS upload failed:', error);
    res.status(500).json({ error: 'Failed to upload file to IPFS' });
  }
});

// Upload multiple files to IPFS
router.post('/upload-batch', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    if (!ipfsClient) {
      return res.status(503).json({ error: 'IPFS service unavailable' });
    }

    const { pin = true } = req.body;
    const results = [];
    const pool = getPool();

    for (const file of req.files) {
      const { originalname, buffer, mimetype, size } = file;

      // Upload to IPFS
      const result = await ipfsClient.add({
        path: originalname,
        content: buffer,
      });

      const hash = result.cid.toString();

      // Pin the content if requested
      if (pin) {
        await ipfsClient.pin.add(hash);
      }

      // Store file info in database
      await pool.query(`
        INSERT INTO ipfs_files (hash, filename, mimetype, size, pinned)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (hash) DO UPDATE SET
          filename = EXCLUDED.filename,
          mimetype = EXCLUDED.mimetype,
          size = EXCLUDED.size,
          pinned = EXCLUDED.pinned,
          updated_at = CURRENT_TIMESTAMP
      `, [hash, originalname, mimetype, size, pin]);

      results.push({
        hash,
        filename: originalname,
        size,
        mimetype,
        gatewayUrl: `https://ipfs.io/ipfs/${hash}`,
        pinned: pin
      });
    }

    logger.info(`Batch uploaded ${results.length} files to IPFS`);

    res.json({
      success: true,
      files: results
    });
  } catch (error) {
    logger.error('IPFS batch upload failed:', error);
    res.status(500).json({ error: 'Failed to upload files to IPFS' });
  }
});

// Upload JSON metadata to IPFS
router.post('/upload-metadata', [
  body('metadata').isObject().withMessage('Metadata must be an object'),
  body('filename').optional().isString().withMessage('Filename must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!ipfsClient) {
      return res.status(503).json({ error: 'IPFS service unavailable' });
    }

    const { metadata, filename = 'metadata.json', pin = true } = req.body;

    // Convert metadata to JSON string
    const jsonString = JSON.stringify(metadata, null, 2);
    const buffer = Buffer.from(jsonString, 'utf8');

    // Upload to IPFS
    const result = await ipfsClient.add({
      path: filename,
      content: buffer,
    });

    const hash = result.cid.toString();

    // Pin the content if requested
    if (pin) {
      await ipfsClient.pin.add(hash);
    }

    // Store metadata info in database
    const pool = getPool();
    await pool.query(`
      INSERT INTO ipfs_files (hash, filename, mimetype, size, metadata, pinned)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (hash) DO UPDATE SET
        filename = EXCLUDED.filename,
        mimetype = EXCLUDED.mimetype,
        size = EXCLUDED.size,
        metadata = EXCLUDED.metadata,
        pinned = EXCLUDED.pinned,
        updated_at = CURRENT_TIMESTAMP
    `, [hash, filename, 'application/json', buffer.length, metadata, pin]);

    logger.info(`Metadata uploaded to IPFS: ${hash}`);

    res.json({
      success: true,
      hash,
      filename,
      size: buffer.length,
      gatewayUrl: `https://ipfs.io/ipfs/${hash}`,
      pinned: pin
    });
  } catch (error) {
    logger.error('IPFS metadata upload failed:', error);
    res.status(500).json({ error: 'Failed to upload metadata to IPFS' });
  }
});

// Get file info from IPFS
router.get('/file/:hash', async (req, res) => {
  try {
    const { hash } = req.params;
    
    // Check cache first
    const cacheKey = `ipfs_file_${hash}`;
    const cachedInfo = await getCache(cacheKey);
    if (cachedInfo) {
      return res.json(cachedInfo);
    }

    const pool = getPool();
    const result = await pool.query(`
      SELECT * FROM ipfs_files WHERE hash = $1
    `, [hash]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const fileInfo = {
      hash: result.rows[0].hash,
      filename: result.rows[0].filename,
      mimetype: result.rows[0].mimetype,
      size: result.rows[0].size,
      metadata: result.rows[0].metadata,
      pinned: result.rows[0].pinned,
      gatewayUrl: `https://ipfs.io/ipfs/${hash}`,
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at
    };

    await setCache(cacheKey, fileInfo, 3600); // Cache for 1 hour
    res.json(fileInfo);
  } catch (error) {
    logger.error('Error fetching IPFS file info:', error);
    res.status(500).json({ error: 'Failed to fetch file info' });
  }
});

// Pin content to IPFS
router.post('/pin/:hash', async (req, res) => {
  try {
    const { hash } = req.params;

    if (!ipfsClient) {
      return res.status(503).json({ error: 'IPFS service unavailable' });
    }

    // Pin the content
    await ipfsClient.pin.add(hash);

    // Update database
    const pool = getPool();
    await pool.query(`
      UPDATE ipfs_files 
      SET pinned = true, updated_at = CURRENT_TIMESTAMP
      WHERE hash = $1
    `, [hash]);

    logger.info(`Content pinned to IPFS: ${hash}`);

    res.json({
      success: true,
      hash,
      pinned: true
    });
  } catch (error) {
    logger.error('IPFS pinning failed:', error);
    res.status(500).json({ error: 'Failed to pin content to IPFS' });
  }
});

// Unpin content from IPFS
router.delete('/pin/:hash', async (req, res) => {
  try {
    const { hash } = req.params;

    if (!ipfsClient) {
      return res.status(503).json({ error: 'IPFS service unavailable' });
    }

    // Unpin the content
    await ipfsClient.pin.rm(hash);

    // Update database
    const pool = getPool();
    await pool.query(`
      UPDATE ipfs_files 
      SET pinned = false, updated_at = CURRENT_TIMESTAMP
      WHERE hash = $1
    `, [hash]);

    logger.info(`Content unpinned from IPFS: ${hash}`);

    res.json({
      success: true,
      hash,
      pinned: false
    });
  } catch (error) {
    logger.error('IPFS unpinning failed:', error);
    res.status(500).json({ error: 'Failed to unpin content from IPFS' });
  }
});

// Get IPFS node status
router.get('/status', async (req, res) => {
  try {
    if (!ipfsClient) {
      return res.json({
        available: false,
        error: 'IPFS client not initialized'
      });
    }

    const nodeInfo = await ipfsClient.id();
    
    res.json({
      available: true,
      nodeId: nodeInfo.id,
      agentVersion: nodeInfo.agentVersion,
      protocolVersion: nodeInfo.protocolVersion,
      addresses: nodeInfo.addresses
    });
  } catch (error) {
    logger.error('IPFS status check failed:', error);
    res.json({
      available: false,
      error: error.message
    });
  }
});

// List user's uploaded files
router.get('/files', async (req, res) => {
  try {
    const { page = 1, limit = 20, mimetype } = req.query;
    const offset = (page - 1) * limit;

    const pool = getPool();
    let query = `
      SELECT hash, filename, mimetype, size, pinned, created_at
      FROM ipfs_files
    `;
    let params = [];
    let paramCount = 0;

    if (mimetype) {
      query += ` WHERE mimetype LIKE $${++paramCount}`;
      params.push(`${mimetype}%`);
    }

    query += ` ORDER BY created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    const totalQuery = mimetype 
      ? 'SELECT COUNT(*) FROM ipfs_files WHERE mimetype LIKE $1'
      : 'SELECT COUNT(*) FROM ipfs_files';
    const totalParams = mimetype ? [`${mimetype}%`] : [];
    const totalResult = await pool.query(totalQuery, totalParams);

    res.json({
      files: result.rows.map(file => ({
        ...file,
        gatewayUrl: `https://ipfs.io/ipfs/${file.hash}`
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(totalResult.rows[0].count),
        pages: Math.ceil(totalResult.rows[0].count / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching IPFS files:', error);
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

module.exports = router;
