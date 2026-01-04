/**
 * UserService GraphQL Query & Mutation Helpers
 */

export const queries = {
  GET_ME: `
    query GetMe {
      me {
        id
        username
        email
        firstName
        lastName
        createdAt
      }
    }
  `,

  GET_USERS: `
    query GetUsers {
      users {
        id
        username
        email
        firstName
        lastName
        createdAt
      }
    }
  `,

  GET_USER: `
    query GetUser($id: ID!) {
      user(id: $id) {
        id
        username
        email
        firstName
        lastName
        createdAt
      }
    }
  `,

  GET_USER_BY_USERNAME: `
    query GetUserByUsername($username: String!) {
      userByUsername(username: $username) {
        id
        username
        email
        firstName
        lastName
        createdAt
      }
    }
  `
};

export const mutations = {
  REGISTER_USER: `
    mutation RegisterUser($input: RegisterUserInput!) {
      registerUser(input: $input) {
        success
        message
        user {
          id
          username
          email
        }
        token
      }
    }
  `,

  LOGIN_USER: `
    mutation LoginUser($input: LoginUserInput!) {
      loginUser(input: $input) {
        success
        message
        user {
          id
          username
          email
        }
        token
      }
    }
  `,

  UPDATE_USER: `
    mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
      updateUser(id: $id, input: $input) {
        success
        message
        user {
          id
          username
          email
          firstName
          lastName
        }
      }
    }
  `,

  DELETE_USER: `
    mutation DeleteUser($id: ID!) {
      deleteUser(id: $id) {
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
