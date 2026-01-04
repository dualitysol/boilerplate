/**
 * UserService GraphQL Resolvers
 * 
 * Thin delegation layer - all business logic is in UserService.
 * Resolvers only handle GraphQL-specific concerns and delegate to service.
 * 
 * Architecture: GraphQL -> Resolver (this) -> Service -> Model -> Entity
 */

export const resolvers = {
  Query: {
    /**
     * Get current user
     * @param {Object} _ - Parent (unused)
     * @param {Object} __ - Args (unused)
     * @param {Object} context - GraphQL context
     * @returns {Promise<Object|null>} Current user or null if not authenticated
     */
    me: async (_, __, { currentUser, service }) => {
      if (!currentUser) return null;
      return await service.getUserById(currentUser.id);
    },

    /**
     * Get all users
     * @param {Object} _ - Parent (unused)
     * @param {Object} __ - Args (unused)
     * @param {Object} context - GraphQL context
     * @returns {Promise<Array>} List of all users
     */
    users: async (_, __, { service }) => {
      return await service.getAllUsers();
    },

    /**
     * Get user by ID
     * @param {Object} _ - Parent (unused)
     * @param {Object} args - Query arguments
     * @param {string} args.id - User ID
     * @param {Object} context - GraphQL context
     * @returns {Promise<Object|null>} User or null if not found
     */
    user: async (_, { id }, { service }) => {
      return await service.getUserById(id);
    },

    /**
     * Get user by email
     * @param {Object} _ - Parent (unused)
     * @param {Object} args - Query arguments
     * @param {string} args.email - User email
     * @param {Object} context - GraphQL context
     * @returns {Promise<Object|null>} User or null if not found
     */
    userByEmail: async (_, { email }, { service }) => {
      return await service.getUserByEmail(email);
    },
  },

  Mutation: {
    /**
     * Register new user
     * @param {Object} _ - Parent (unused)
     * @param {Object} args - Mutation arguments
     * @param {Object} args.input - Registration data
     * @param {Object} context - GraphQL context
     * @returns {Promise<Object>} Registration response
     */
    registerUser: async (_, { input }, { service }) => {
      try {
        const { user, token } = await service.registerUser(input);
        return {
          success: true,
          message: 'User registered successfully',
          user,
          token
        };
      } catch (error) {
        return {
          success: false,
          message: error.message,
          user: null,
          token: null
        };
      }
    },

    /**
     * Login user
     * @param {Object} _ - Parent (unused)
     * @param {Object} args - Mutation arguments
     * @param {Object} args.input - Login credentials
     * @param {Object} context - GraphQL context
     * @returns {Promise<Object>} Login response
     */
    loginUser: async (_, { input }, { service }) => {
      try {
        const { user, token } = await service.loginUser(input);
        return {
          success: true,
          message: 'Login successful',
          user,
          token
        };
      } catch (error) {
        return {
          success: false,
          message: error.message,
          user: null,
          token: null
        };
      }
    },

    /**
     * Update user profile
     * @param {Object} _ - Parent (unused)
     * @param {Object} args - Mutation arguments
     * @param {string} args.id - User ID
     * @param {Object} args.input - Update data
     * @param {Object} context - GraphQL context
     * @returns {Promise<Object>} Update response
     */
    updateProfile: async (_, { id, input }, { currentUser, service }) => {
      if (!currentUser) {
        return {
          success: false,
          message: 'Not authenticated',
          user: null
        };
      }

      try {
        const user = await service.updateProfile(id, input, currentUser.id);
        return {
          success: true,
          message: 'Profile updated successfully',
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

    /**
     * Verify user email
     * @param {Object} _ - Parent (unused)
     * @param {Object} args - Mutation arguments
     * @param {string} args.userId - User ID
     * @param {Object} context - GraphQL context
     * @returns {Promise<Object>} Verification response
     */
    verifyEmail: async (_, { userId }, { currentUser, service }) => {
      if (!currentUser || currentUser.id !== userId) {
        return {
          success: false,
          message: 'Not authorized',
          user: null
        };
      }

      try {
        const user = await service.verifyEmail(userId);
        return {
          success: true,
          message: 'Email verified successfully',
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

    /**
     * Change user role (admin only)
     * @param {Object} _ - Parent (unused)
     * @param {Object} args - Mutation arguments
     * @param {string} args.userId - User ID to update
     * @param {string} args.role - New role
     * @param {Object} context - GraphQL context
     * @returns {Promise<Object>} Role change response
     */
    changeUserRole: async (_, { userId, role }, { currentUser, service }) => {
      if (!currentUser) {
        return {
          success: false,
          message: 'Not authenticated',
          user: null
        };
      }

      try {
        const user = await service.changeUserRole(userId, role, currentUser.id);
        return {
          success: true,
          message: 'User role updated successfully',
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

    /**
     * Delete user
     * @param {Object} _ - Parent (unused)
     * @param {Object} args - Mutation arguments
     * @param {string} args.id - User ID
     * @param {Object} context - GraphQL context
     * @returns {Promise<Object>} Deletion response
     */
    deleteUser: async (_, { id }, { currentUser, service }) => {
      if (!currentUser) {
        return {
          success: false,
          message: 'Not authenticated'
        };
      }

      try {
        await service.deleteUser(id, currentUser.id);
        return {
          success: true,
          message: 'User deleted successfully'
        };
      } catch (error) {
        return {
          success: false,
          message: error.message
        };
      }
    },
  },

  /**
   * Field resolvers for User type
   */
  User: {
    /**
     * Get user's todos
     * @param {Object} parent - Parent User object
     * @param {Object} _ - Args (unused)
     * @param {Object} context - GraphQL context
     * @returns {Promise<Array>} List of user's todos
     */
    todos: async (parent, _, { services }) => {
      if (!services || !services.TodoService) {
        return [];
      }
      try {
        return await services.TodoService.getUserTodos(parent.id);
      } catch (error) {
        console.error('Error fetching user todos:', error);
        return [];
      }
    },
  },
};

export default resolvers;
