/**
 * GraphQL Resolvers for Todo App
 */

export const resolvers = {
  Query: {
    // User queries
    me: async (_, __, { currentUser, userService }) => {
      if (!currentUser) return null;
      return await userService.getUserById(currentUser.id);
    },

    users: async (_, __, { userService }) => {
      return await userService.getUsers();
    },

    user: async (_, { id }, { userService }) => {
      return await userService.getUserById(id);
    },

    // Todo queries
    todos: async (_, { completed, category }, { todoService }) => {
      return await todoService.getTodos({ completed, category });
    },

    todo: async (_, { id }, { todoService }) => {
      return await todoService.getTodoById(id);
    },

    myTodos: async (_, { completed }, { currentUser, todoService }) => {
      if (!currentUser) {
        throw new Error('Not authenticated');
      }
      return await todoService.getTodosForUser(currentUser.id, { completed });
    },
  },

  Mutation: {
    // User mutations
    registerUser: async (_, { input }, { userService }) => {
      try {
        const user = await userService.registerUser(input);
        return {
          success: true,
          message: 'User registered successfully',
          user,
          token: 'demo-token-' + user.id // In production, use JWT
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

    loginUser: async (_, { input }, { userService }) => {
      try {
        const user = await userService.loginUser(input);
        return {
          success: true,
          message: 'Login successful',
          user,
          token: 'demo-token-' + user.id // In production, use JWT
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

    // Todo mutations
    createTodo: async (_, { input }, { currentUser, todoService }) => {
      if (!currentUser) {
        return {
          success: false,
          message: 'Not authenticated',
          todo: null
        };
      }

      try {
        const todo = await todoService.createTodo({
          userId: currentUser.id,
          ...input
        });
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

    updateTodo: async (_, { id, input }, { currentUser, todoService }) => {
      if (!currentUser) {
        return {
          success: false,
          message: 'Not authenticated',
          todo: null
        };
      }

      try {
        const todo = await todoService.updateTodo(id, input);
        
        // Check ownership
        if (todo.userId !== currentUser.id) {
          return {
            success: false,
            message: 'Not authorized',
            todo: null
          };
        }

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

    toggleTodo: async (_, { id }, { currentUser, todoService }) => {
      if (!currentUser) {
        return {
          success: false,
          message: 'Not authenticated',
          todo: null
        };
      }

      try {
        const todo = await todoService.toggleTodo(id);
        
        // Check ownership
        if (todo.userId !== currentUser.id) {
          return {
            success: false,
            message: 'Not authorized',
            todo: null
          };
        }

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

    deleteTodo: async (_, { id }, { currentUser, todoService }) => {
      if (!currentUser) {
        return {
          success: false,
          message: 'Not authenticated'
        };
      }

      try {
        const todo = await todoService.getTodoById(id);
        
        // Check ownership
        if (todo.userId !== currentUser.id) {
          return {
            success: false,
            message: 'Not authorized'
          };
        }

        await todoService.deleteTodo(id);
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

  // Field resolvers
  Todo: {
    user: async (parent, _, { userService }) => {
      return await userService.getUserById(parent.userId);
    },
  },
};
