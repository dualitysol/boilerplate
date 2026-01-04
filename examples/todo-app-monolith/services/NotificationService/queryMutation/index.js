/**
 * NotificationService GraphQL Query & Mutation Helpers
 */

export const queries = {
  GET_MY_NOTIFICATIONS: `
    query GetMyNotifications($limit: Int) {
      myNotifications(limit: $limit) {
        id
        type
        message
        status
        sentAt
        readAt
      }
    }
  `
};

export const mutations = {
  MARK_AS_READ: `
    mutation MarkNotificationAsRead($id: ID!) {
      markNotificationAsRead(id: $id) {
        success
        message
      }
    }
  `
};

export default {
  queries,
  mutations
};
