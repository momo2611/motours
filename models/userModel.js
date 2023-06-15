const mongoose = require('mongoose')
const validator = require('validator')
const bcrypt = require('bcrypt')
const crypto = require('crypto')

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide your name'],
        maxlength: [40, 'An user name must have less or equal then 40 chars'],
        minlength: [4, 'An user name must have less or equal then 4 chars'],
    },
    email: {
        type: String,
        unique: true,
        lowercase: true,
        required: [true, 'Please provide your email'],
        validate: [validator.isEmail, 'Your email is not valid']
    },
    photo: {
        type: String,
        default: 'default.jpg'
    },
    role: {
        type: String,
        enum: ['user', 'guide', 'lead-guide', 'admin'],
        default: 'user'
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        minlength: [8, 'A password must have less or equal then 8 chars'],
        select: false
    },
    passwordConfirm: {
        type: String,
        required: [true, 'Please confirm your password'],
        validate: {
            validator: function (el) {
                return el === this.password //confirm
            },
            message: 'Passwords are not match!'
        },
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpired: Date,
    active: {
        type: Boolean,
        default: true,
        select: false
    },
    favorite: [
        {
            type: mongoose.Schema.ObjectId,
            ref: 'Tour'
        }
    ]
})

userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next()

    this.password = await bcrypt.hash(this.password, 12)
    this.passwordConfirm = undefined
    next()
})

userSchema.pre('save', function (next) {
    if (!this.isModified('password') || this.isNew) return next()

    this.passwordChangedAt = Date.now() - 1000
    next()
})

userSchema.pre(/^find/, function (next) {
    this.find({ active: { $ne: false } })
    next()
})

userSchema.methods.correctPassword = async function (candidatePassword, userPassword) {
    return await bcrypt.compare(candidatePassword, userPassword)
}

userSchema.methods.changePasswordAfter = function (JWTTimeStamp) {
    if (this.passwordChangedAt) {
        const changedTimeStamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10)
        return JWTTimeStamp < changedTimeStamp
    }
    // false means not changed
    return false
}

userSchema.methods.createPasswordResetToken = function () {
    const resetToken = crypto.randomBytes(32).toString('hex')

    this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex')
    this.passwordResetExpired = Date.now() + 10 * 60 * 1000 //10 mins

    return resetToken
}

const User = mongoose.model('User', userSchema)

module.exports = User