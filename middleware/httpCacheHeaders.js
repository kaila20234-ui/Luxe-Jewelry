/**
 * HTTP Caching Middleware
 * Implements browser-level caching with proper HTTP headers
 */

const httpCacheMiddleware = (req, res, next) => {
  // Override res.json to add cache headers
  const originalJson = res.json.bind(res);
  
  res.json = function(data) {
    // Determine cache duration based on route
    let cacheControl = 'private, max-age=3600'; // 1 hour default
    let eTag = null;
    
    if (req.path.includes('/api/products')) {
      // Products: 10 minutes
      cacheControl = 'public, max-age=600';
      eTag = `W/"products-${Date.now()}"`;
    } else if (req.path.includes('/api/categories')) {
      // Categories: 1 hour (rarely change)
      cacheControl = 'public, max-age=3600';
      eTag = `W/"categories-${Date.now()}"`;
    } else if (req.path.includes('/api/user')) {
      // User data: no cache
      cacheControl = 'private, no-cache';
    } else if (req.path.includes('/api/search')) {
      // Search: 5 minutes
      cacheControl = 'public, max-age=300';
    }
    
    // Set cache headers
    res.set('Cache-Control', cacheControl);
    if (eTag) res.set('ETag', eTag);
    res.set('Last-Modified', new Date().toUTCString());
    res.set('Expires', new Date(Date.now() + 3600000).toUTCString());
    
    return originalJson(data);
  };
  
  next();
};

/**
 * Etag-based conditional requests
 */
const conditionalRequestMiddleware = (req, res, next) => {
  const ifNoneMatch = req.get('If-None-Match');
  const ifModifiedSince = req.get('If-Modified-Since');
  
  if (ifNoneMatch) {
    const currentETag = `W/"${req.path}-${Math.floor(Date.now() / 60000)}"`; // Changes every minute
    
    if (ifNoneMatch === currentETag) {
      return res.status(304).end(); // Not Modified
    }
  }
  
  if (ifModifiedSince) {
    const lastModified = new Date(ifModifiedSince);
    const now = new Date();
    
    if (now.getTime() - lastModified.getTime() < 60000) { // Within 1 minute
      return res.status(304).end(); // Not Modified
    }
  }
  
  next();
};

/**
 * Service worker cache strategy headers
 */
const serviceWorkerCacheHeaders = (req, res, next) => {
  // Indicate to service workers which resources to cache
  
  if (req.path.endsWith('.js') || req.path.endsWith('.css')) {
    // Cache static assets aggressively
    res.set('Cache-Control', 'public, max-age=31536000'); // 1 year
    res.set('X-Cache-Strategy', 'static');
  } else if (req.path.includes('/api/')) {
    // API responses can be cached but need validation
    res.set('X-Cache-Strategy', 'api');
    res.set('X-API-Cacheable', 'true');
  } else {
    // HTML pages: stale-while-revalidate
    res.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=604800');
    res.set('X-Cache-Strategy', 'html');
  }
  
  next();
};

module.exports = {
  httpCacheMiddleware,
  conditionalRequestMiddleware,
  serviceWorkerCacheHeaders
};
