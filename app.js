const express = require('express');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const compression = require('compression')

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');

const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRoute = require('./routes/reviewRoutes');
const bookingRoute = require('./routes/bookingRoutes');
const viewRoute = require('./routes/viewRoutes');

const app = express();

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// global middleware
// serving static files
app.use(express.static(path.join(__dirname, 'public')));

// set security HTTP headers
//app.use(helmet())
const scriptSrcUrls = [
    "'self'",
    'https:',
    'http:',
    'blob:',
    'https://js.stripe.com',
    'https://m.stripe.network',
    'https://*.cloudflare.com',
    'https://unpkg.com/',
    'https://tile.openstreetmap.org',
];
const styleSrcUrls = [
    'https:',
    "'self'",
    "'unsafe-inline'",
    'https://unpkg.com/',
    'https://tile.openstreetmap.org',
    'https://fonts.googleapis.com/',
];
const connectSrcUrls = [
    'https://unpkg.com',
    'https://*.stripe.com',
    'https://tile.openstreetmap.org',
    'https://*.cloudflare.com/',
    'https://bundle.js:*',
    'ws://127.0.0.1:*/',
];
const fontSrcUrls = ['fonts.googleapis.com', 'fonts.gstatic.com'];

app.use(
    helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: [],
            frameSrc: ["'self'", 'https://js.stripe.com'],
            connectSrc: ["'self'", ...connectSrcUrls],
            scriptSrc: ["'self'", ...scriptSrcUrls],
            styleSrc: ["'self'", "'unsafe-inline'", ...styleSrcUrls],
            workerSrc: ["'self'", 'blob:'],
            objectSrc: [],
            imgSrc: ["'self'", 'blob:', 'data:', 'https:'],
            fontSrc: ["'self'", ...fontSrcUrls],
        },
    })
);

// dev environment logging
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// allow 100 reqs from same IP in 1 hour
const limiter = rateLimit({
    max: 100,
    windowMs: 60 * 60 * 1000,
    message: 'Too many request from this IP please try again in an hour!',
});

app.use('/api', limiter);

// body parser, reading data from body to req.body
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// data sanitization against NoSQL query injection
app.use(mongoSanitize());
// data sanitization against XSS
app.use(xss());

// prevent http params pollution
app.use(
    hpp({
        whitelist: [
            // except
            'duration',
            'ratingsQuantity',
            'ratingsAverage',
            'maxGroupSize',
            'difficulty',
            'price',
        ],
    })
);

app.use(compression())

// Test middleware
app.use((req, res, next) => {
    req.requestTime = new Date().toISOString();
    next();
});

// routes
app.use('/', viewRoute);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRoute);
app.use('/api/v1/bookings', bookingRoute);

// error handling
app.all('*', (req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
