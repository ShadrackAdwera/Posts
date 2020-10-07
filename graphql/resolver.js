const bcrypt = require('bcrypt');
const validator = require('validator');
const jwt = require('jsonwebtoken');

const User = require('../models/user');
const Post = require('../models/post');
const { clearImage } = require('../utils/file')

module.exports = {
  createUser: async (args, req) => {
    const { email, name, password } = args.userInput;
    const errors = [];

    if (!validator.default.isEmail(email)) {
      errors.push({ message: 'Invalid email' });
    }
    if (
      validator.default.isEmpty(password) ||
      !validator.default.isLength(password, { min: 6 })
    ) {
      errors.push({ message: 'Password length is too short!' });
    }
    if (errors.length > 0) {
      const error = new Error('Invalid inputs');
      error.data = errors;
      error.code = 422;
      throw error;
    }

    let existingUser;
    let hashedPassword;
    try {
      existingUser = await User.findOne({ email: email });
    } catch (error) {
      throw new Error('Unable to fetch');
    }
    if (existingUser) {
      throw new Error('Email exists, try logging in!');
    }

    try {
      hashedPassword = await bcrypt.hash(password, 12);
    } catch (error) {
      throw new Error('Unable to hash password');
    }
    const newUser = new User({
      email,
      name,
      password: hashedPassword,
    });
    try {
      await newUser.save();
    } catch (error) {
      throw new Error('Unable to sign in');
    }
    return { ...newUser._doc, _id: newUser._id.toString() };
  },
  login: async function ({ email, password }, req) {
    let existingUser;
    let isPassword;
    let token;

    try {
      existingUser = await User.findOne({ email: email });
    } catch (error) {
      throw new Error('Unable to fetch user email');
    }
    if (!existingUser) {
      const error = new Error('Email does not exist, try signing up!');
      error.code = 401;
      throw error;
    }

    try {
      isPassword = await bcrypt.compare(password, existingUser.password);
    } catch (error) {
      throw new Error('Auth failed!');
    }
    if (!isPassword) {
      const error = new Error('Invalid password! Try again');
      error.code = 401;
      throw error;
    }

    try {
      token = jwt.sign(
        { userId: existingUser._id.toString(), email: existingUser.email },
        'somesupersecretsecret',
        { expiresIn: '1h' }
      );
    } catch (error) {
      throw new Error('Token generation failed!');
    }
    return { token: token, userId: existingUser._id.toString() };
  },
  createPost: async (args, req) => {
    if (!req.isAuth) {
      const error = new Error('You are not authenticated!!');
      error.code = 401;
      throw error;
    }
    const { title, content, imageUrl } = args.postInput;
    let createdPost;
    let foundUser;
    const errors = [];
    if (
      validator.default.isEmpty(title) ||
      !validator.default.isLength(title, { min: 5 })
    ) {
      errors.push({ message: 'Title is too short(min 5 characters)' });
    }
    if (
      validator.default.isEmpty(content) ||
      !validator.default.isLength(content, { min: 8 })
    ) {
      errors.push({ message: 'Content length is too short(min 8 characters)' });
    }

    if (errors.length > 0) {
      const error = new Error('Invalid inputs');
      error.data = errors;
      error.code = 422;
      throw error;
    }

    try {
      foundUser = await User.findById(req.userId);
    } catch (error) {
      throw new Error('Unable to fetch user');
    }
    if (!foundUser) {
      const error = new Error('User does not exist!');
      error.code = 422;
      throw error;
    }

    const newPost = new Post({
      title,
      content,
      imageUrl,
      creator: foundUser,
    });

    try {
      createdPost = await newPost.save();
    } catch (error) {
      throw new Error('Unable to create post, provide all fields');
    }
    //Add posts to user - transactions
    try {
      foundUser.posts.push(newPost);
      await foundUser.save();
    } catch (error) {
      throw new Error('Unable to add posts to user');
    }
    return {
      ...createdPost._doc,
      _id: createdPost._id.toString(),
      createdAt: createdPost.createdAt.toISOString(),
      updatedAt: createdPost.updatedAt.toISOString(),
    };
  },
  posts: async ({ page }, req) => {
    let totalPosts;
    let allPosts;
    if (!req.isAuth) {
      const error = new Error('You are not authenticated!!');
      error.code = 401;
      throw error;
    }

    if (!page) {
      page = 1;
    }
    const perPage = 2;

    try {
      totalPosts = await Post.find().countDocuments();
      allPosts = await Post.find()
        .sort({ createdAt: -1 })
        .skip((page - 1) * perPage)
        .limit(perPage)
        .populate('creator');
    } catch (error) {
      throw new Error('Unable to fetch posts');
    }
    return {
      posts: allPosts.map((post) => {
        return {
          ...post._doc,
          _id: post._id.toString(),
          createdAt: post.createdAt.toISOString(),
          updatedAt: post.updatedAt.toISOString(),
        };
      }),
      totalPosts: totalPosts,
    };
  },
  post: async (args, req) => {
    const { id } = args;
    if (!req.isAuth) {
      const error = new Error('You are not authenticated!!');
      error.code = 401;
      throw error;
    }
    const post = await Post.findById(id).populate('creator');
    if (!post) {
      const error = new Error('No posts found!');
      error.code = 404;
      throw error;
    }

    return {
      ...post._doc,
      id: post._id.toString(),
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
    };
  },
  updatePost: async ({ id, postInput }, req) => {
    if (!req.isAuth) {
      const error = new Error('You are not authenticated!!');
      error.code = 401;
      throw error;
    }
    const foundPost = await Post.findById(id).populate('creator');
    if (!foundPost) {
      const error = new Error('Post not found!');
      error.code = 404;
      throw error;
    }

    if (foundPost.creator._id.toString() !== req.userId.toString()) {
      const error = new Error(
        'You are not authorized to perform this action!!'
      );
      error.code = 403;
      throw error;
    }
    const errors = [];
    if (
      validator.default.isEmpty(postInput.title) ||
      !validator.default.isLength(postInput.title, { min: 5 })
    ) {
      errors.push({ message: 'Title is too short(min 5 characters)' });
    }
    if (
      validator.default.isEmpty(postInput.content) ||
      !validator.default.isLength(postInput.content, { min: 8 })
    ) {
      errors.push({ message: 'Content length is too short(min 8 characters)' });
    }

    if (errors.length > 0) {
      const error = new Error('Invalid inputs');
      error.data = errors;
      error.code = 422;
      throw error;
    }

    foundPost.title = postInput.title;
    foundPost.content = postInput.content;
    if (postInput.imageUrl !== 'undefined') {
      foundPost.imageUrl = postInput.imageUrl;
    }
    const updatedPost = await foundPost.save();
    return {
      ...updatedPost._doc,
      _id: updatedPost._id.toString(),
      createdAt: updatedPost.createdAt.toISOString(),
      updatedAt: updatedPost.updatedAt.toISOString(),
    };
  },
  deletePost: async({id}, req) => {
    if (!req.isAuth) {
      const error = new Error('You are not authenticated!!');
      error.code = 401;
      throw error;
    }
    const foundPost = await Post.findById(id)

    if(!foundPost) {
      const error = new Error('Post does not exist!');
      error.code = 404;
      throw error;
    }
    if(foundPost.creator.toString() !== req.userId.toString()) {
      const error = new Error('You are not authorized to perform this action!');
      error.code = 403;
      throw error;
    }

    clearImage(foundPost.imageUrl)
    await Post.findByIdAndRemove(id)

    const user = await User.findById(req.userId)
    user.posts.pull(id)
    await user.save()
    return true
  },
  user: async(args, req) => {
    if (!req.isAuth) {
      const error = new Error('You are not authenticated!!');
      error.code = 401;
      throw error;
    }
    const user = await User.findById(req.userId)
    if(!user) {
      const error = new Error('User does not exist!');
      error.code = 404;
      throw error;
    }
    return { ...user._doc, _id: user._id.toString() }
  },
  updateStatus: async({status}, req) => {
    if (!req.isAuth) {
      const error = new Error('You are not authenticated!!');
      error.code = 401;
      throw error;
    }
    const user = await User.findById(req.userId)
    if(!user) {
      const error = new Error('User does not exist!');
      error.code = 404;
      throw error;
    }
    user.status = status
    await user.save()

    return{ ...user._doc, _id: user._id.toString()}

  }
};
