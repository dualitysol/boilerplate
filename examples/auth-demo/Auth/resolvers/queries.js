/**
 * Auth Query Resolvers
 */

export default {
  async me(_, __, context) {
    const { user } = context;
    
    if (!user) {
      return null;
    }
    
    return user;
  },
  
  async validateToken(_, { token }, context) {
    const { services } = context;
    
    try {
      const payload = await services.AuthService.verifyAccessToken(token);
      
      const user = await services.UserService.getUserById(payload.userId);
      
      return {
        success: true,
        message: 'Token is valid',
        user
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        user: null
      };
    }
  },
  
  async getOAuth2Url(_, { provider }, context) {
    const { services } = context;
    
    const authUrl = services.OAuth2Service.getAuthorizationUrl({
      provider,
      scope: ['email', 'profile']
    });
    
    return authUrl;
  }
};
