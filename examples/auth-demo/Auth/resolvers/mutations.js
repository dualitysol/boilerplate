/**
 * Auth Mutation Resolvers
 */

export default {
  async register(_, { input }, context) {
    const { services } = context;
    
    try {
      // Create user
      const user = await services.UserService.createUser(input);
      
      // Generate tokens
      const tokens = await services.AuthService.generateTokens({
        userId: user.id,
        email: user.email,
        role: user.role
      });
      
      return {
        success: true,
        message: 'Registration successful',
        user,
        tokens
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        user: null,
        tokens: null
      };
    }
  },
  
  async login(_, { input }, context) {
    const { services } = context;
    
    try {
      // Validate credentials
      const user = await services.UserService.validateCredentials(
        input.email,
        input.password
      );
      
      if (!user) {
        return {
          success: false,
          message: 'Invalid credentials',
          user: null,
          tokens: null
        };
      }
      
      // Generate tokens
      const tokens = await services.AuthService.generateTokens({
        userId: user.id,
        email: user.email,
        role: user.role
      });
      
      return {
        success: true,
        message: 'Login successful',
        user,
        tokens
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        user: null,
        tokens: null
      };
    }
  },
  
  async refreshToken(_, { refreshToken }, context) {
    const { services } = context;
    
    try {
      // Refresh tokens
      const tokens = await services.AuthService.refreshTokens(refreshToken);
      
      // Get user from new token
      const payload = await services.AuthService.verifyAccessToken(tokens.accessToken);
      const user = await services.UserService.getUserById(payload.userId);
      
      return {
        success: true,
        message: 'Token refreshed',
        user,
        tokens
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        user: null,
        tokens: null
      };
    }
  },
  
  async logout(_, { refreshToken }, context) {
    const { services } = context;
    
    try {
      // Verify and revoke token
      const payload = await services.AuthService.verifyRefreshToken(refreshToken);
      await services.AuthService.revokeToken(payload.jti);
      
      return {
        success: true,
        message: 'Logged out successfully',
        user: null,
        tokens: null
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        user: null,
        tokens: null
      };
    }
  },
  
  async logoutAll(_, __, context) {
    const { user, services } = context;
    
    if (!user) {
      return {
        success: false,
        message: 'Not authenticated',
        user: null,
        tokens: null
      };
    }
    
    try {
      // Revoke all user tokens
      await services.AuthService.revokeAllUserTokens(user.id);
      
      return {
        success: true,
        message: 'Logged out from all devices',
        user: null,
        tokens: null
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        user: null,
        tokens: null
      };
    }
  },
  
  async oauth2Callback(_, { code, state }, context) {
    const { services } = context;
    
    try {
      // Exchange code for tokens
      const oauthTokens = await services.OAuth2Service.getTokensFromCode(code, state);
      
      // Get user info from provider
      const userInfo = await services.OAuth2Service.getUserInfo(oauthTokens.access_token);
      
      // Find or create user
      let user = await services.UserService.findByEmail(userInfo.email);
      
      if (!user) {
        user = await services.UserService.createUser({
          email: userInfo.email,
          name: userInfo.name,
          password: null, // OAuth user
          role: 'user'
        });
      }
      
      // Generate our tokens
      const tokens = await services.AuthService.generateTokens({
        userId: user.id,
        email: user.email,
        role: user.role
      });
      
      return {
        success: true,
        message: 'OAuth2 login successful',
        user,
        tokens
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        user: null,
        tokens: null
      };
    }
  },
  
  async createSession(_, { userId }, context) {
    const { services, req } = context;
    
    try {
      const session = await services.SessionService.create({ userId }, req);
      
      return {
        success: true,
        message: 'Session created',
        session: {
          id: session.id,
          userId: session.userId,
          createdAt: session.createdAt.toISOString(),
          expiresAt: session.expiresAt.toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        session: null
      };
    }
  },
  
  async destroySession(_, { sessionId }, context) {
    const { services } = context;
    
    try {
      await services.SessionService.destroy(sessionId);
      
      return {
        success: true,
        message: 'Session destroyed',
        session: null
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        session: null
      };
    }
  }
};
