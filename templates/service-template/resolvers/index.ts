/**
 * GraphQL Resolvers
 * 
 * Resolvers for GraphQL queries and mutations
 */

export const resolvers = {
  Query: {
    {{serviceName}}: async (_, { id }, { model }) => {
      return await model.findById(id);
    },

    {{serviceName}}s: async (_, { filter }, { model }) => {
      return await model.findAll(filter || {});
    }
  },

  Mutation: {
    create{{ServiceName}}: async (_, { input }, { model }) => {
      return await model.create(input);
    },

    update{{ServiceName}}: async (_, { id, input }, { model }) => {
      return await model.update(id, input);
    },

    delete{{ServiceName}}: async (_, { id }, { model }) => {
      const success = await model.delete(id);
      return { success };
    }
  },

  // Nested resolvers for related entities
  {{ServiceName}}: {
    // Example:
    // user: async (parent, _, { dataSources }) => {
    //   return await dataSources.userService.findById(parent.userId);
    // }
  }
};

export default resolvers;
