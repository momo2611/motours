const AppError = require("../utils/appError")

const handleCastErrorDB = err => {
    const message = `Invalid ${err.path}: ${err.value}.`
    return new AppError(message, 400)
}
const handleDupFieldsDB = err => {
    const valueDup = Object.values(err.keyValue);
    const message = `Duplicate fields value ${valueDup}. Please use another value!`
    return new AppError(message, 400)
}
const handleValidationDB = err => {
    const errors = Object.values(err.errors).map(el => el.message);

    const message = `Invalid input data. ${errors.join('. ')}.`
    return new AppError(message, 400)
}

const handleJWT = () => new AppError('Invalid token. Please log in again!', 401)

const handleJWTExpired = () => new AppError('Token expired. Please log in again!', 401)

const sendErrorDev = (err, req, res) => {
    if (req.originalUrl.startsWith('/api')) {
        return res.status(err.statusCode).json({
            status: err.status,
            error: err,
            message: err.message,
            stack: err.stack
        })
    }
    console.error('ERROR', err)
    return res.status(err.statusCode).render('error', {
        title: 'Something went wrong!',
        msg: err.message
    })
}
const sendErrorProd = (err, req, res) => {
    // Operational, trusted error: send msg to client
    if (req.originalUrl.startsWith('/api')) {
        if (err.isOperational) {
            return res.status(err.statusCode).json({
                status: err.status,
                message: err.message,
            })
        }
        // Programing or other unknow error: don't leak error details
        // log error
        console.error('ERROR', err)
        // send msg
        return res.status(500).json({
            status: 'error',
            message: 'Something went wrong!'
        })
    }
    if (err.isOperational) {
        return res.status(err.statusCode).render('error', {
            title: 'Something went wrong!',
            msg: err.message
        })
    }
    // Programing or other unknow error: don't leak error details
    // log error
    console.error('ERROR', err)
    // send msg
    return res.status(err.statusCode).render('error', {
        title: 'Something went wrong!',
        msg: 'Please try again later!'
    })
}

module.exports = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500
    err.status = err.status || 'error'

    if (process.env.NODE_ENV === 'development') {
        sendErrorDev(err, req, res)
    } else if (process.env.NODE_ENV === 'production ') {
        let error = Object.assign(err)

        if (error.name === 'CastError') error = handleCastErrorDB(error)
        if (error.code === 11000) error = handleDupFieldsDB(error)
        if (error.name === "ValidationError") error = handleValidationDB(error)
        if (error.name === "JsonWebTokenError") error = handleJWT()
        if (error.name === "TokenExpiredError") error = handleJWTExpired()

        sendErrorProd(error, req, res)
    }
}