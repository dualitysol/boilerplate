/**
 * Product Mutation Resolvers
 */

export default {
  async createProduct(_, { input }, context) {
    const { services } = context;
    
    try {
      const product = await services.ProductService.createProduct(input);
      
      return {
        success: true,
        message: 'Product created successfully',
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
        message: 'Product updated successfully',
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
        message: 'Product deleted successfully',
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
  
  async updateStock(_, { id, quantity }, context) {
    const { services } = context;
    
    try {
      const product = await services.ProductService.updateStock(id, quantity);
      
      if (!product) {
        return {
          success: false,
          message: 'Product not found',
          product: null
        };
      }
      
      return {
        success: true,
        message: `Stock updated to ${product.stock}`,
        product
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        product: null
      };
    }
  }
};
