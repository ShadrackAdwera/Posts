const bcrypt = require('bcrypt')
const validator = require('validator')
//const jwt = require('jsonwebtoken')

const User = require('../models/user')


module.exports = {
    createUser: async(args, req) => {
        const { email, name ,password } = args.userInput
        const errors = []

        if(!validator.default.isEmail(email)) {
            errors.push({message: 'Invalid email'})
        }
        if(validator.default.isEmpty(password) || !validator.default.isLength(password, {min:6})) {
            errors.push({message: 'Password length is too short!'})
        }
        if(errors.length>0) {
            const error = new Error('Invalid inputs')
            error.data = errors
            error.code = 422
            throw error
        }
        
        let existingUser
        let hashedPassword
        try {
            existingUser = await User.findOne({email: email})
        } catch (error) {
            throw new Error('Unable to fetch')
        }
        if(existingUser) {
            throw new Error('Email exists, try logging in!')
        }

        try {
            hashedPassword = await bcrypt.hash(password, 12)
        } catch (error) {
            throw new Error('Unable to hash password')
        }
        const newUser = new User({
            email, name, password: hashedPassword
        })
        try {
            await newUser.save()
        } catch (error) {
            throw new Error('Unable to sign in')
        }
        return {...newUser._doc, _id: newUser._id.toString()}

    }
}