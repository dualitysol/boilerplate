/**
 * TodoService GraphQL Resolvers
 * 
 * Thin layer that delegates to TodoService business logic.
 * Resolvers should NOT contain business logic - only delegation and response formatting.
 * 
 * Architecture: GraphQL Query/Mutation -> Resolver (this) -> Service -> Model -> Entity
 */

export const resolvers = {
  Query: {
    /**
     * Get all todos with optional filters
     * @param {Object} _ - Parent (unused)
     * @param {Object} args - Query arguments
     * @param {boolean} [args.completed] - Filter by completion status
     * @param {string} [args.category] - Filter by category  
     * @param {number} [args.priority] - Filter by priority
     * @param {import('../../../types/TodoService/dto/context.js').Context} context - GraphQL context
     * @returns {Promise<Array>} List of todos
     */
    todos: async (_, { completed, category, priority }, { service }) => {
      return await service.getAllTodos({ completed, category, priority });
    },

    /**
     * Get single todo by ID
     * @param {Object} _ - Parent (unused)
     * @param {Object} args - Query arguments
     * @param {string} args.id - Todo ID
     * @param {import('../../../types/TodoService/dto/context.js').Context} context - GraphQL context
     * @returns {Promise<Object|null>} Todo or null if not found
     */
    todo: async (_, { id }, { service }) => {
      return await service.getTodoById(id);
    },

    /**
     * Get current user's todos
     * @param {Object} _ - Parent (unused)
     * @param {Object} args - Query arguments
     * @param {boolean} [args.completed] - Filter by completion status
     * @param {import('../../../types/TodoService/dto/context.js').Context} context - GraphQL context
     * @returns {Promise<Array>} List of user's todos
     */
    myTodos: async (_, { completed }, { currentUser, service }) => {
      if (!currentUser) {
        throw new Error('Not authenticated');
      }
      return await service.getUserTodos(currentUser.id, { completed });
    },

    /**
     * Get todo statistics for current user
     * @param {Object} _ - Parent (unused)
     * @param {Object} __ - Args (unused)
     * @param {import('../../../types/TodoService/dto/context.js').Context} context - GraphQL context
     * @returns {Promise<Object>} Statistics object
     */
    todoStats: async (_, __, { currentUser, service }) => {
      if (!currentUser) {
        throw new Error('Not authenticated');
      }
      return await service.getUserStats(currentUser.id);
    },

    /**
     * Get overdue todos for current user
     * @param {Object} _ - Parent (unused)
     * @param {Object} __ - Args (unused)
     * @param {import('../../../types/TodoService/dto/context.js').Context} context - GraphQL context
     * @returns {Promise<Array>} List of overdue todos
     */
    overdueTodos: async (_, __, { currentUser, service }) => {
      if (!currentUser) {
        throw new Error('Not authenticated');
      }
      return await service.getOverdueTodos(currentUser.id);
    },

    /**
     * Get high priority todos for current user
     * @param {Object} _ - Parent (unused)
     * @param {Object} args - Query arguments
     * @param {number} [args.minPriority=4] - Minimum priority level
     * @param {import('../../../types/TodoService/dto/context.js').Context} context - GraphQL context
     * @returns {Promise<Array>} List of high priority todos
     */
    highPriorityTodos: async (_, { minPriority }, { currentUser, service }) => {
      if (!currentUser) {
        throw new Error('Not authenticated');
      }
      return await service.getHighPriorityTodos(currentUser.id, minPriority);
    },
  },

  Mutation: {
    /**
     * Create new todo
     * @param {Object} _ - Parent (unused)
     * @param {Object} args - Mutation arguments
     * @param {Object} args.input - Todo input data
     * @param {import('../../../types/TodoService/dto/context.js').Context} context - GraphQL context
     * @returns {Promise<Object>} Response object with success, message, and todo
     */
    createTodo: async (_, { input }, { currentUser, service }) => {
      if (!currentUser) {
        return {
          success: false,
          message: 'Not authenticated',
          todo: null
        };
      }

      try {
        const todo = await service.createTodo(input, currentUser.id);
        return {
          success: true,
          message: 'Todo created successfully',
          todo
        };
      } catch (error) {
        return {
          success: false,
          message: error.message,
          todo: null
        };
      }
    },

    /**
     * Update existing todo
     * @param {Object} _ - Parent (unused)
     * @param {Object} args - Mutation arguments
     * @param {string} args.id - Todo ID
     * @param {Object} args.input - Update data
     * @param {import('../../../types/TodoService/dto/context.js').Context} context - GraphQL context
     * @returns {Promise<Object>} Response object
     */
    updateTodo: async (_, { id, input }, { currentUser, service }) => {
      if (!currentUser) {
        return {
          success: false,
          message: 'Not authenticated',
          todo: null
        };
      }

      try {
        const todo = await service.updateTodo(id, input, currentUser.id);
        return {
          success: true,
          message: 'Todo updated successfully',
          todo
        };
      } catch (error) {
        return {
          success: false,
          message: error.message,
          todo: null
        };
      }
    },

    /**
     * Toggle todo completion status
     * @param {Object} _ - Parent (unused)
     * @param {Object} args - Mutation arguments
     * @param {string} args.id - Todo ID
     * @param {import('../../../types/TodoService/dto/context.js').Context} context - GraphQL context
     * @returns {Promise<Object>} Response object
     */
    toggleTodo: async (_, { id }, { currentUser, service }) => {
      if (!currentUser) {
        return {
          success: false,
          message: 'Not authenticated',
          todo: null
        };
      }

      try {
        const todo = await service.toggleTodo(id, currentUser.id);
        return {
          success: true,
          message: 'Todo toggled successfully',
          todo
        };
      } catch (error) {
        return {
          success: false,
          message: error.message,
          todo: null
        };
      }
    },

    /**
     * Delete todo
     * @param {Object} _ - Parent (unused)
     * @param {Object} args - Mutation arguments
     * @param {string} args.id - Todo ID
     * @param {import('../../../types/TodoService/dto/context.js').Context} context - GraphQL context
     * @returns {Promise<Object>} Response object
     */
    deleteTodo: async (_, { id }, { currentUser, service }) => {
      if (!currentUser) {
        return {
          success: false,
          message: 'Not authenticated'
        };
      }

      try {
        await service.deleteTodo(id, currentUser.id);
        return {
          success: true,
          message: 'Todo deleted successfully'
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
   * Field resolvers for Todo type
   */
  Todo: {
    /**
     * Resolve user field - fetch user data from UserService
     * @param {import('../../../types/TodoService/dto/parent.js').Parent} parent - Parent Todo object
     * @param {Object} _ - Args (unused)
     * @param {import('../../../types/TodoService/dto/context.js').Context} context - GraphQL context
     * @returns {Promise<Object|null>} User object or null
     */
    user: async (parent, _, { services }) => {
      if (!services || !services.UserService) {
        return null;
      }
      try {
        return await services.UserService.getUserById(parent.userId);
      } catch (error) {
        console.error('Error fetching user:', error);
        return null;
      }
    },
  },
};

export default resolvers;
