/**
 * Products Routes with Caching
 * Provides cached product listing and search endpoints
 * Phase 5 Week 1 - Performance Optimization
 */

const express = require('express');
const router = express.Router();
const cacheService = require('../services/cacheService');

// Mock data - replace with actual database queries in production
const mockProducts = [
  { id: 1, name: 'Diamond Ring', category: 'rings', price: 5000, rating: 4.5 },
  { id: 2, name: 'Gold Necklace', category: 'necklaces', price: 3000, rating: 4.8 },
  { id: 3, name: 'Silver Bracelet', category: 'bracelets', price: 1500, rating: 4.2 },
  { id: 4, name: 'Emerald Earrings', category: 'earrings', price: 2500, rating: 4.7 },
  { id: 5, name: 'Pearl Pendant', category: 'pendants', price: 2000, rating: 4.6 }
];

/**
 * GET /api/products-cached
 * Get all products with caching
 * Cache Duration: 5 minutes (300 seconds)
 */
router.get('/products-cached', async (req, res) => {
  try {
    const page = req.query.page || 1;
    const limit = req.query.limit || 10;
    const cacheKey = `products:list:${page}:${limit}`;

    const products = await cacheService.getOrSet(
      cacheKey,
      async () => {
        console.log(`[CACHE] Computing products list (page ${page}, limit ${limit})`);
        // Simulate database query
        await new Promise(resolve => setTimeout(resolve, 10));
        const start = (page - 1) * limit;
        const end = start + limit;
        return mockProducts.slice(start, end);
      },
      300 // 5 minutes cache
    );

    res.json({
      success: true,
      page,
      limit,
      total: mockProducts.length,
      data: products,
      cache: true
    });
  } catch (err) {
    console.error('[API] Error fetching products:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

/**
 * GET /api/products-cached/:id
 * Get single product with caching
 * Cache Duration: 10 minutes (600 seconds)
 */
router.get('/products-cached/:id', async (req, res) => {
  try {
    const productId = req.params.id;
    const cacheKey = `product:${productId}`;

    const product = await cacheService.getOrSet(
      cacheKey,
      async () => {
        console.log(`[CACHE] Computing product ${productId}`);
        // Simulate database query
        await new Promise(resolve => setTimeout(resolve, 5));
        return mockProducts.find(p => p.id === Number.parseInt(productId));
      },
      600 // 10 minutes cache
    );

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({
      success: true,
      data: product,
      cache: true
    });
  } catch (err) {
    console.error('[API] Error fetching product:', err);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

/**
 * GET /api/products-cached/search
 * Search products with caching
 * Cache Duration: 5 minutes (300 seconds)
 */
router.get('/search-cached', async (req, res) => {
  try {
    const query = req.query.q || '';
    const category = req.query.category || '';
    const cacheKey = `search:${query}:${category}`;

    const results = await cacheService.getOrSet(
      cacheKey,
      async () => {
        console.log(`[CACHE] Computing search for "${query}" in "${category}"`);
        // Simulate search query
        await new Promise(resolve => setTimeout(resolve, 15));
        return mockProducts.filter(p =>
          (query === '' || p.name.toLowerCase().includes(query.toLowerCase())) &&
          (category === '' || p.category === category)
        );
      },
      300 // 5 minutes cache
    );

    res.json({
      success: true,
      query,
      category,
      count: results.length,
      data: results,
      cache: true
    });
  } catch (err) {
    console.error('[API] Error searching products:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

/**
 * GET /api/products-cached/by-category/:category
 * Get products by category with caching
 * Cache Duration: 10 minutes (600 seconds)
 */
router.get('/by-category-cached/:category', async (req, res) => {
  try {
    const category = req.params.category;
    const cacheKey = `products:category:${category}`;

    const products = await cacheService.getOrSet(
      cacheKey,
      async () => {
        console.log(`[CACHE] Computing products for category "${category}"`);
        // Simulate database query
        await new Promise(resolve => setTimeout(resolve, 8));
        return mockProducts.filter(p => p.category === category);
      },
      600 // 10 minutes cache
    );

    res.json({
      success: true,
      category,
      count: products.length,
      data: products,
      cache: true
    });
  } catch (err) {
    console.error('[API] Error fetching category products:', err);
    res.status(500).json({ error: 'Failed to fetch category products' });
  }
});

/**
 * POST /api/products-cached/invalidate
 * Invalidate product cache
 * Admin only
 */
router.post('/invalidate-cache', async (req, res) => {
  try {
    const { pattern } = req.body;
    
    if (!pattern) {
      return res.status(400).json({ error: 'Pattern required' });
    }

    const deleted = await cacheService.invalidatePattern(pattern);

    res.json({
      success: true,
      message: `Invalidated ${deleted} cache entries`,
      pattern,
      deleted
    });
  } catch (err) {
    console.error('[API] Error invalidating cache:', err);
    res.status(500).json({ error: 'Failed to invalidate cache' });
  }
});

/**
 * GET /api/cache-stats
 * Get cache statistics
 */
router.get('/cache-stats', async (req, res) => {
  try {
    const stats = cacheService.getStats();

    res.json({
      success: true,
      stats: {
        hits: stats.hits,
        misses: stats.misses,
        gets: stats.gets,
        sets: stats.sets,
        deletes: stats.deletes,
        errors: stats.errors,
        hitRate: stats.hitRate
      }
    });
  } catch (err) {
    console.error('[API] Error getting cache stats:', err);
    res.status(500).json({ error: 'Failed to get cache stats' });
  }
});

/**
 * POST /api/cache-clear
 * Clear all cache
 * Admin only
 */
router.post('/cache-clear', async (req, res) => {
  try {
    const success = await cacheService.clear();

    res.json({
      success,
      message: success ? 'Cache cleared successfully' : 'Failed to clear cache'
    });
  } catch (err) {
    console.error('[API] Error clearing cache:', err);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

module.exports = router;
