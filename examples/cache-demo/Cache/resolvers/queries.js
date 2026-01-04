/**
 * Cache Query Resolvers
 */

export default {
  async cachedProduct(_, { id }, context) {
    const { services } = context;
    
    try {
      const product = await services.ProductService.getCachedProduct(id);
      
      if (!product) {
        return {
          success: false,
          message: 'Product not found',
          product: null
        };
      }
      
      return {
        success: true,
        product
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        product: null
      };
    }
  },
  
  async cachedProducts(_, { category, limit = 50 }, context) {
    const { services } = context;
    
    try {
      const products = await services.ProductService.getCachedProducts({ category, limit });
      
      return {
        success: true,
        products,
        total: products.length
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        products: [],
        total: 0
      };
    }
  },
  
  async productStats(_, { category }, context) {
    const { services } = context;
    
    try {
      const products = await services.ProductService.getProductStats(category);
      
      return {
        success: true,
        products,
        total: products.length
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        products: [],
        total: 0
      };
    }
  },
  
  async cacheStats(_, __, context) {
    const { services } = context;
    
    try {
      const stats = services.CacheService.getStats();
      
      return {
        success: true,
        stats
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        stats: {
          hits: 0,
          misses: 0,
          sets: 0,
          deletes: 0,
          hitRate: 0,
          size: 0
        }
      };
    }
  }
};
