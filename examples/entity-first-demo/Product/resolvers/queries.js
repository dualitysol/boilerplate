/**
 * Product Query Resolvers
 */

export default {
  async products(_, args, context) {
    const { category, minPrice, maxPrice, limit = 50, offset = 0 } = args;
    const { services } = context;
    
    try {
      const products = await services.ProductService.getProducts({
        category,
        minPrice,
        maxPrice,
        limit,
        offset
      });
      
      const total = await services.ProductService.countProducts({
        category,
        minPrice,
        maxPrice
      });
      
      return {
        success: true,
        products,
        total
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
  
  async product(_, { id }, context) {
    const { services } = context;
    
    try {
      const product = await services.ProductService.getProductById(id);
      
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
  
  async searchProducts(_, { query, limit = 20 }, context) {
    const { services } = context;
    
    try {
      const products = await services.ProductService.searchProducts(query, limit);
      
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
  }
};
