/**
 * TodoService GraphQL Query & Mutation Helpers
 */

export const queries = {
  GET_TODOS: `
    query GetTodos($completed: Boolean, $category: String) {
      todos(completed: $completed, category: $category) {
        id
        title
        description
        completed
        category
        dueDate
        createdAt
        updatedAt
      }
    }
  `,

  GET_TODO: `
    query GetTodo($id: ID!) {
      todo(id: $id) {
        id
        title
        description
        completed
        category
        dueDate
        userId
        user {
          id
          username
        }
        createdAt
        updatedAt
      }
    }
  `,

  GET_MY_TODOS: `
    query GetMyTodos($completed: Boolean) {
      myTodos(completed: $completed) {
        id
        title
        description
        completed
        category
        dueDate
        createdAt
        updatedAt
      }
    }
  `,

  GET_TODO_STATS: `
    query GetTodoStats {
      todoStats {
        total
        completed
        pending
        completionRate
      }
    }
  `
};

export const mutations = {
  CREATE_TODO: `
    mutation CreateTodo($input: CreateTodoInput!) {
      createTodo(input: $input) {
        success
        message
        todo {
          id
          title
          description
          completed
          category
        }
      }
    }
  `,

  UPDATE_TODO: `
    mutation UpdateTodo($id: ID!, $input: UpdateTodoInput!) {
      updateTodo(id: $id, input: $input) {
        success
        message
        todo {
          id
          title
          description
          completed
          category
          updatedAt
        }
      }
    }
  `,

  TOGGLE_TODO: `
    mutation ToggleTodo($id: ID!) {
      toggleTodo(id: $id) {
        success
        message
        todo {
          id
          completed
          updatedAt
        }
      }
    }
  `,

  DELETE_TODO: `
    mutation DeleteTodo($id: ID!) {
      deleteTodo(id: $id) {
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
