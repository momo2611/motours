const { promisify } = require('util')
const crypto = require('crypto')

const jwt = require('jsonwebtoken')
const User = require('./../models/userModel')
const catchAsync = require('./../utils/catchAsync')
const AppError = require('./../utils/appError')
const Email = require('./../utils/email')

const signToken = id => {
    return jwt.sign({ id: id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
    })
}

const createSendToken = (user, statusCode, res) => {
    const token = signToken(user._id)
    const cookieOptions = {
        expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
    }

    res.cookie('jwt', token, cookieOptions)

    // remove password from output
    user.password = undefined

    res.status(statusCode).json({
        status: 'success',
        token,
        data: {
            user
        }
    })
}

exports.signup = catchAsync(async (req, res, next) => {
    const newUser = await User.create(req.body)
    const url = `${req.protocol}://${req.get('host')}/me`
    await new Email(newUser, url).sendWelcome()

    createSendToken(newUser, 201, res)
})

exports.login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body

    // check if email or pass exist
    if (!email || !password) {
        return next(new AppError('Please provide email & password!', 400))
    }
    // check if user exist, pass correct
    const user = await User.findOne({ email: email }).select('+password')

    if (!user || !(await user.correctPassword(password, user.password))) {
        return next(new AppError('Incorrect email or password!', 401))
    }
    // if ok, send token to client
    createSendToken(user, 200, res)
})

exports.logout = (req, res) => {
    res.cookie('jwt', 'loggedout', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true
    })
    res.status(200).json({ status: 'success' })
}

exports.protect = catchAsync(async (req, res, next) => {
    // get token and check if exist
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1]
    } else if (req.cookies.jwt) {
        token = req.cookies.jwt
    }

    if (!token) {
        return next(new AppError('You are not logged in! Please log in to get access.', '401'))
    }
    // verification token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET)
    // check if user still exist
    const currentUser = await User.findById(decoded.id)
    if (!currentUser) {
        return next(new AppError('The user belonging to this token does no longer exist!', 401))
    }
    // check if user change password after the token was issued
    if (currentUser.changePasswordAfter(decoded.iat)) {
        return next(new AppError('User recently changed password. Please log in again!', 401))
    }
    // grant access to protected route
    req.user = currentUser
    res.locals.user = currentUser
    next()
})

// only for rendered pages
exports.isLoggedIn = async (req, res, next) => {
    if (req.cookies.jwt) {
        try {
            // verify token
            const decoded = await promisify(jwt.verify)(req.cookies.jwt, process.env.JWT_SECRET)
            const currentUser = await User.findById(decoded.id)
            if (!currentUser) return next()
            // check if user change password after the token was issued
            if (currentUser.changePasswordAfter(decoded.iat)) return next()

            // grant access to protected route
            res.locals.user = currentUser
            return next()
        } catch (error) {
            return next()
        }
    }
    next()
}

exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        //roles['admin', 'lead-guide']
        if (!roles.includes(req.user.role)) {
            return next(new AppError("You don't have permission to perform this action", 403))
        }
        next()
    }
}

exports.forgotPassword = catchAsync(async (req, res, next) => {
    // get user based on POSTed email
    const user = await User.findOne({ email: req.body.email })
    if (!user) {
        return next(new AppError('There is no user with that email!', 404))
    }
    // generate random reset token
    const resetToken = user.createPasswordResetToken()
    await user.save({ validateBeforeSave: false })

    // send to user's email
    try {
        const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`
        await new Email(user, resetURL).sendPasswordRs()
        res.status(200).json({
            status: 'success',
            message: 'Token sent to email!'
        })
    } catch (error) {
        user.passwordResetToken = undefined
        user.passwordResetExpired = undefined
        await user.save({ validateBeforeSave: false })

        return next(new AppError('There was an error sending an email, try again later!', 500))
    }

})

exports.resetPassword = catchAsync(async (req, res, next) => {
    // get user based on token
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex')
    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpired: { $gt: Date.now() } //greater than
    })
    // set new password only if token not expired and there is user
    if (!user) {
        return next(new AppError('Token is invalid or has expired!', 400))
    }
    user.password = req.body.password
    user.passwordConfirm = req.body.passwordConfirm
    user.passwordResetToken = undefined
    user.passwordResetExpired = undefined
    await user.save()
    // update changedPasswordAt for the user

    // log the user in, send JWT
    createSendToken(user, 200, res)
})

exports.updatePassword = catchAsync(async (req, res, next) => {
    // get user from collection
    const user = await User.findById(req.user.id).select('+password')

    // check if POSTed password is correct
    if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
        return next(new AppError('Your current password is wrong!', 401))
    }
    // If so, update password
    user.password = req.body.password
    user.passwordConfirm = req.body.passwordConfirm
    await user.save()
    // log user in, send JWT
    createSendToken(user, 200, res)
})