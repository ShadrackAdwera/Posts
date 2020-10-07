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

input PostInfo {
    title: String!
    content: String!
    imageUrl: String!
}

type PostData {
    posts: [Post!]!
    totalPosts: Int!
}

type AuthData {
    token: String!
    userId: String!
}

type rootQuery {
    login(email:String!, password: String!): AuthData!
    posts(page:Int): PostData!
    post(id:ID!): Post!
    user: User!
}

type rootMutation {
    createUser(userInput: userInfo): User!
    createPost(postInput: PostInfo): Post!
    updatePost(id: ID!, postInput: PostInfo) : Post!
    deletePost(id: ID!): Boolean
    updateStatus(status: String!): User!
}

schema {
    query: rootQuery
    mutation: rootMutation
}
`)