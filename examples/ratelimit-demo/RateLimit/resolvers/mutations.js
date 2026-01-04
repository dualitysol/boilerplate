/**
 * RateLimit Mutation Resolvers
 */

export default {
  async createResource(_, { data }, context) {
    const { services, rateLimitInfo } = context;
    
    // Simulate resource creation
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return {
      success: true,
      message: `Resource created: ${data}`,
      timestamp: new Date().toISOString(),
      rateLimit: rateLimitInfo || null
    };
  },
  
  async processData(_, { input }, context) {
    const { services, rateLimitInfo } = context;
    
    // Simulate expensive processing
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      success: true,
      message: `Data processed: ${input.substring(0, 20)}...`,
      timestamp: new Date().toISOString(),
      rateLimit: rateLimitInfo || null
    };
  }
};
