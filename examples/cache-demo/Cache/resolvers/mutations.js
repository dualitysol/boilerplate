/**
 * Cache Mutation Resolvers
 */

export default {
  async createProduct(_, { input }, context) {
    const { services } = context;
    
    try {
      const product = await services.ProductService.createProduct(input);
      
      return {
        success: true,
        message: 'Product created and cached',
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
  
  async updateProduct(_, { id, input }, context) {
    const { services } = context;
    
    try {
      const product = await services.ProductService.updateProduct(id, input);
      
      if (!product) {
        return {
          success: false,
          message: 'Product not found',
          product: null
        };
      }
      
      return {
        success: true,
        message: 'Product updated, cache invalidated',
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
  
  async deleteProduct(_, { id }, context) {
    const { services } = context;
    
    try {
      await services.ProductService.deleteProduct(id);
      
      return {
        success: true,
        message: 'Product deleted, cache invalidated',
        product: null
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        product: null
      };
    }
  },
  
  async clearCache(_, __, context) {
    const { services } = context;
    
    try {
      await services.CacheService.clear();
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
