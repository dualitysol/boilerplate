/**
 * NotificationService GraphQL Resolvers
 */

export const resolvers = {
  Query: {
    myNotifications: async (_, { limit }, { currentUser, model }) => {
      if (!currentUser) {
        throw new Error('Not authenticated');
      }
      return await model.findByUser(currentUser.id, limit || 10);
    },
  },

  Mutation: {
    markNotificationAsRead: async (_, { id }, { currentUser, model }) => {
      if (!currentUser) {
        return {
          success: false,
          message: 'Not authenticated'
        };
      }

      try {
        await model.markAsRead(id);
        return {
          success: true,
          message: 'Notification marked as read'
        };
      } catch (error) {
        return {
          success: false,
          message: error.message
        };
      }
    },
  },
};

export default resolvers;
