const { buildSchema } = require('graphql')

module.exports = buildSchema(`

type Post {
    _id: ID!
    title: String!
    content: String!
    imageUrl: String!
    creator: User!
    createdAt: String!
    updatedAt: String!

}

type User {
    _id: ID!
    name: String!
    email: String!
    password: String!
    status: String!
    posts: [Post!]!
}

input userInfo {
    email: String!
    name: String!
    password: String!
}

type AuthData {
    token: String!
    userId: STring
}

type rootQuery {
    login(email:String!, password: String!): AuthData!
}

type rootMutation {
    createUser(userInput: userInfo): User!
}

schema {
    query: rootQuery
    mutation: rootMutation
}
`)