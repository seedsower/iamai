const express = require('express');
const { body, validationResult } = require('express-validator');
const { PublicKey } = require('@solana/web3.js');
const { getPool } = require('../config/database');
const { setCache, getCache, deleteCache } = require('../config/redis');
const logger = require('../utils/logger');

const router = express.Router();

// Get all models
router.get('/models', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      category, 
      type, 
      minPrice, 
      maxPrice, 
      sortBy = 'created_at',
      sortOrder = 'DESC',
      search 
    } = req.query;
    
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE is_active = true';
    const queryParams = [];
    let paramCount = 0;

    if (category) {
      whereClause += ` AND category = $${++paramCount}`;
      queryParams.push(category);
    }

    if (type) {
      whereClause += ` AND model_type = $${++paramCount}`;
      queryParams.push(type);
    }

    if (minPrice) {
      whereClause += ` AND price >= $${++paramCount}`;
      queryParams.push(parseInt(minPrice) * 1e9);
    }

    if (maxPrice) {
      whereClause += ` AND price <= $${++paramCount}`;
      queryParams.push(parseInt(maxPrice) * 1e9);
    }

    if (search) {
      whereClause += ` AND (title ILIKE $${++paramCount} OR description ILIKE $${++paramCount})`;
      queryParams.push(`%${search}%`, `%${search}%`);
      paramCount++;
    }

    const validSortFields = ['created_at', 'price', 'sales_count', 'rating_sum'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const pool = getPool();
    
    const models = await pool.query(`
      SELECT 
        id,
        creator_address,
        title,
        description,
        price,
        ipfs_hash,
        model_type,
        category,
        tags,
        sales_count,
        total_revenue,
        rating_sum,
        rating_count,
        created_at,
        updated_at
      FROM marketplace_models 
      ${whereClause}
      ORDER BY ${sortField} ${order}
      LIMIT $${++paramCount} OFFSET $${++paramCount}
    `, [...queryParams, limit, offset]);

    const totalCount = await pool.query(`
      SELECT COUNT(*) FROM marketplace_models ${whereClause}
    `, queryParams);

    res.json({
      models: models.rows.map(model => ({
        id: model.id,
        creator: model.creator_address,
        title: model.title,
        description: model.description,
        price: parseInt(model.price),
        priceFormatted: (parseInt(model.price) / 1e9).toFixed(2),
        ipfsHash: model.ipfs_hash,
        type: model.model_type,
        category: model.category,
        tags: model.tags,
        salesCount: model.sales_count,
        totalRevenue: parseInt(model.total_revenue),
        rating: model.rating_count > 0 ? (model.rating_sum / model.rating_count).toFixed(1) : 0,
        ratingCount: model.rating_count,
        createdAt: model.created_at,
        updatedAt: model.updated_at
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(totalCount.rows[0].count),
        pages: Math.ceil(totalCount.rows[0].count / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching models:', error);
    res.status(500).json({ error: 'Failed to fetch models' });
  }
});

// Get user's models
router.get('/user-models/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    // Validate wallet address
    try {
      new PublicKey(address);
    } catch {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const pool = getPool();
    
    const models = await pool.query(`
      SELECT 
        id,
        title,
        description,
        price,
        ipfs_hash,
        model_type,
        category,
        tags,
        sales_count,
        total_revenue,
        rating_sum,
        rating_count,
        is_active,
        created_at
      FROM marketplace_models 
      WHERE creator_address = $1
      ORDER BY created_at DESC
    `, [address]);

    const purchases = await pool.query(`
      SELECT 
        mp.model_id,
        mm.title,
        mm.creator_address,
        mp.price_paid,
        mp.created_at
      FROM model_purchases mp
      JOIN marketplace_models mm ON mp.model_id = mm.id
      WHERE mp.buyer_address = $1
      ORDER BY mp.created_at DESC
    `, [address]);

    res.json({
      createdModels: models.rows.map(model => ({
        id: model.id,
        title: model.title,
        description: model.description,
        price: parseInt(model.price),
        priceFormatted: (parseInt(model.price) / 1e9).toFixed(2),
        ipfsHash: model.ipfs_hash,
        type: model.model_type,
        category: model.category,
        tags: model.tags,
        salesCount: model.sales_count,
        totalRevenue: parseInt(model.total_revenue),
        rating: model.rating_count > 0 ? (model.rating_sum / model.rating_count).toFixed(1) : 0,
        ratingCount: model.rating_count,
        isActive: model.is_active,
        createdAt: model.created_at
      })),
      purchasedModels: purchases.rows.map(purchase => ({
        modelId: purchase.model_id,
        title: purchase.title,
        creator: purchase.creator_address,
        pricePaid: parseInt(purchase.price_paid),
        purchasedAt: purchase.created_at
      }))
    });
  } catch (error) {
    logger.error('Error fetching user models:', error);
    res.status(500).json({ error: 'Failed to fetch user models' });
  }
});

// List new model
router.post('/list-model', [
  body('creator').isString().isLength({ min: 32, max: 44 }).withMessage('Invalid creator address'),
  body('title').isString().isLength({ min: 5, max: 200 }).withMessage('Title must be 5-200 characters'),
  body('description').isString().isLength({ min: 20, max: 2000 }).withMessage('Description must be 20-2000 characters'),
  body('price').isFloat({ min: 0.01 }).withMessage('Price must be at least 0.01'),
  body('ipfsHash').isString().isLength({ min: 10, max: 100 }).withMessage('Invalid IPFS hash'),
  body('type').isIn(['LanguageModel', 'ImageGeneration', 'AudioProcessing', 'DataAnalysis', 'ComputerVision', 'Other']).withMessage('Invalid model type'),
  body('category').optional().isString().isLength({ max: 50 }),
  body('tags').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { creator, title, description, price, ipfsHash, type, category, tags } = req.body;
    
    // Validate creator address
    try {
      new PublicKey(creator);
    } catch {
      return res.status(400).json({ error: 'Invalid creator address' });
    }

    const pool = getPool();
    const priceInLamports = Math.floor(price * 1e9);
    const transactionHash = `list_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const result = await pool.query(`
      INSERT INTO marketplace_models 
      (creator_address, title, description, price, ipfs_hash, model_type, category, tags, transaction_hash)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `, [creator, title, description, priceInLamports, ipfsHash, type, category, tags, transactionHash]);

    logger.info(`Model listed: ${creator} listed "${title}" for ${price} IAMAI`);

    res.json({
      success: true,
      modelId: result.rows[0].id,
      transactionHash,
      title,
      price,
      ipfsHash
    });
  } catch (error) {
    logger.error('Error listing model:', error);
    res.status(500).json({ error: 'Failed to list model' });
  }
});

// Purchase model
router.post('/purchase', [
  body('buyer').isString().isLength({ min: 32, max: 44 }).withMessage('Invalid buyer address'),
  body('modelId').isInt({ min: 1 }).withMessage('Invalid model ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { buyer, modelId } = req.body;
    
    // Validate buyer address
    try {
      new PublicKey(buyer);
    } catch {
      return res.status(400).json({ error: 'Invalid buyer address' });
    }

    const pool = getPool();
    
    // Get model details
    const model = await pool.query(`
      SELECT * FROM marketplace_models 
      WHERE id = $1 AND is_active = true
    `, [modelId]);

    if (model.rows.length === 0) {
      return res.status(404).json({ error: 'Model not found or not active' });
    }

    const modelData = model.rows[0];
    
    // Check if already purchased
    const existingPurchase = await pool.query(`
      SELECT id FROM model_purchases 
      WHERE model_id = $1 AND buyer_address = $2
    `, [modelId, buyer]);

    if (existingPurchase.rows.length > 0) {
      return res.status(400).json({ error: 'Model already purchased' });
    }

    const transactionHash = `purchase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Record purchase
    await pool.query(`
      INSERT INTO model_purchases 
      (model_id, buyer_address, price_paid, transaction_hash)
      VALUES ($1, $2, $3, $4)
    `, [modelId, buyer, modelData.price, transactionHash]);

    // Update model statistics
    await pool.query(`
      UPDATE marketplace_models 
      SET sales_count = sales_count + 1,
          total_revenue = total_revenue + $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [modelData.price, modelId]);

    logger.info(`Model purchased: ${buyer} purchased model ${modelId} for ${modelData.price}`);

    res.json({
      success: true,
      transactionHash,
      modelId,
      price: parseInt(modelData.price),
      priceFormatted: (parseInt(modelData.price) / 1e9).toFixed(2)
    });
  } catch (error) {
    logger.error('Error purchasing model:', error);
    res.status(500).json({ error: 'Failed to purchase model' });
  }
});

// Rate and review model
router.post('/rate', [
  body('reviewer').isString().isLength({ min: 32, max: 44 }).withMessage('Invalid reviewer address'),
  body('modelId').isInt({ min: 1 }).withMessage('Invalid model ID'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1-5'),
  body('review').optional().isString().isLength({ max: 1000 }).withMessage('Review too long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { reviewer, modelId, rating, review } = req.body;
    
    // Validate reviewer address
    try {
      new PublicKey(reviewer);
    } catch {
      return res.status(400).json({ error: 'Invalid reviewer address' });
    }

    const pool = getPool();
    
    // Check if user purchased the model
    const purchase = await pool.query(`
      SELECT id FROM model_purchases 
      WHERE model_id = $1 AND buyer_address = $2
    `, [modelId, reviewer]);

    if (purchase.rows.length === 0) {
      return res.status(400).json({ error: 'Must purchase model before reviewing' });
    }

    // Check if already reviewed
    const existingReview = await pool.query(`
      SELECT id FROM model_reviews 
      WHERE model_id = $1 AND reviewer_address = $2
    `, [modelId, reviewer]);

    if (existingReview.rows.length > 0) {
      return res.status(400).json({ error: 'Already reviewed this model' });
    }

    // Add review
    await pool.query(`
      INSERT INTO model_reviews 
      (model_id, reviewer_address, rating, review_text)
      VALUES ($1, $2, $3, $4)
    `, [modelId, reviewer, rating, review || '']);

    // Update model rating
    await pool.query(`
      UPDATE marketplace_models 
      SET rating_sum = rating_sum + $1,
          rating_count = rating_count + 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [rating, modelId]);

    logger.info(`Model reviewed: ${reviewer} rated model ${modelId} with ${rating} stars`);

    res.json({
      success: true,
      modelId,
      rating,
      review: review || ''
    });
  } catch (error) {
    logger.error('Error rating model:', error);
    res.status(500).json({ error: 'Failed to rate model' });
  }
});

// Get marketplace statistics
router.get('/stats', async (req, res) => {
  try {
    const cachedStats = await getCache('marketplace_stats');
    if (cachedStats) {
      return res.json(cachedStats);
    }

    const pool = getPool();
    
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_models,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_models,
        COUNT(DISTINCT creator_address) as unique_creators,
        COALESCE(SUM(sales_count), 0) as total_sales,
        COALESCE(SUM(total_revenue), 0) as total_volume
      FROM marketplace_models
    `);

    const purchaseStats = await pool.query(`
      SELECT 
        COUNT(*) as total_purchases,
        COUNT(DISTINCT buyer_address) as unique_buyers
      FROM model_purchases
    `);

    const typeStats = await pool.query(`
      SELECT 
        model_type,
        COUNT(*) as count,
        COALESCE(SUM(sales_count), 0) as sales
      FROM marketplace_models
      WHERE is_active = true
      GROUP BY model_type
    `);

    const marketplaceStats = {
      totalModels: parseInt(stats.rows[0].total_models),
      activeModels: parseInt(stats.rows[0].active_models),
      uniqueCreators: parseInt(stats.rows[0].unique_creators),
      totalSales: parseInt(stats.rows[0].total_sales),
      totalVolume: parseInt(stats.rows[0].total_volume),
      totalPurchases: parseInt(purchaseStats.rows[0].total_purchases),
      uniqueBuyers: parseInt(purchaseStats.rows[0].unique_buyers),
      modelsByType: typeStats.rows.reduce((acc, row) => {
        acc[row.model_type] = {
          count: parseInt(row.count),
          sales: parseInt(row.sales)
        };
        return acc;
      }, {}),
      lastUpdated: new Date().toISOString()
    };

    await setCache('marketplace_stats', marketplaceStats, 300); // Cache for 5 minutes
    res.json(marketplaceStats);
  } catch (error) {
    logger.error('Error fetching marketplace stats:', error);
    res.status(500).json({ error: 'Failed to fetch marketplace statistics' });
  }
});

module.exports = router;
