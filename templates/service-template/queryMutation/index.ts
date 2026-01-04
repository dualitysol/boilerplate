/**
 * GraphQL Query & Mutation Helpers
 * 
 * Helper functions for working with GraphQL operations
 */

// Queries
export const queries = {
  GET_{{SERVICE_NAME}}: `
    query Get{{ServiceName}}($id: ID!) {
      {{serviceName}}(id: $id) {
        id
        createdAt
        updatedAt
      }
    }
  `,

  LIST_{{SERVICE_NAME}}S: `
    query List{{ServiceName}}s($filter: {{ServiceName}}Filter) {
      {{serviceName}}s(filter: $filter) {
        id
        createdAt
        updatedAt
      }
    }
  `
};

// Mutations
export const mutations = {
  CREATE_{{SERVICE_NAME}}: `
    mutation Create{{ServiceName}}($input: {{ServiceName}}Input!) {
      create{{ServiceName}}(input: $input) {
        id
        createdAt
        updatedAt
      }
    }
  `,

  UPDATE_{{SERVICE_NAME}}: `
    mutation Update{{ServiceName}}($id: ID!, $input: {{ServiceName}}Input!) {
      update{{ServiceName}}(id: $id, input: $input) {
        id
        updatedAt
      }
    }
  `,

  DELETE_{{SERVICE_NAME}}: `
    mutation Delete{{ServiceName}}($id: ID!) {
      delete{{ServiceName}}(id: $id) {
        success
      }
    }
  `
};

export default {
  queries,
  mutations
};
