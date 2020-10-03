const bcrypt = require('bcrypt')
//const jwt = require('jsonwebtoken')

const User = require('../models/user')


module.exports = {
    createUser: async(args, req) => {
        const { email, name ,password } = args.userInput
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