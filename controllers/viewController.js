const Booking = require('../models/bookingModel')
const Tour = require('../models/tourModel')
const User = require('../models/userModel')
const Review = require('../models/reviewModel')
const AppError = require('../utils/appError')
const catchAsync = require('../utils/catchAsync')

exports.alerts = (req, res, next) => {
    const { alert } = req.query
    if (alert === 'booking') {
        res.locals.alert = 'Your booking was successful! If your booking doesn\'t show up here immediately, please come back later.'
    }
    next()
}

exports.getOverview = catchAsync(async (req, res, next) => {
    // get all tour data from collection
    const tours = await Tour.find()

    // build template

    // render template using tour data
    res.status(200).render('overview', {
        title: 'All tour',
        tours
    })
})

exports.getTour = catchAsync(async (req, res, next) => {
    const tour = await Tour.findOne({ slug: req.params.slug }).populate({
        path: 'reviews',
        fields: 'review rating user'
    })

    if (!tour) {
        return next(new AppError('There is no tour with that name', 404))
    }
    if (res.locals.user) {
        const bookings = await Booking.find({
            user: res.locals.user.id,
            tour: tour.id
        });
        res.locals.isBookedTour = bookings.length > 0;
    }

    res.status(200).render('tour', {
        title: tour.name,
        tour
    })
})

exports.getLoginForm = catchAsync(async (req, res, next) => {
    res.status(200)
        .render('login', {
            title: 'Log into your account'
        })
})

exports.getSignupForm = catchAsync(async (req, res, next) => {
    res.status(200)
        .render('signup', {
            title: 'Sign up your account'
        })
})

exports.getAccount = (req, res) => {
    res.status(200)
        .render('account', {
            title: 'Your account'
        })
}

exports.updateUserData = async (req, res, next) => {
    const updatedUser = await User.findByIdAndUpdate(req.user.id, {
        name: req.body.name,
        email: req.body.email
    },
        {
            new: true,
            runValidators: true
        }
    )
    res.status(200)
        .render('account', {
            title: 'Your account',
            user: updatedUser
        })
}

exports.getMyTours = catchAsync(async (req, res, next) => {
    const bookings = await Booking.find({ user: req.user.id })

    const tourIDs = bookings.map(el => el.tour)
    const tours = await Tour.find({ _id: { $in: tourIDs } })

    res.status(200).render('overview', {
        title: 'My Tours',
        tours
    })
})

exports.getMyReviews = catchAsync(async (req, res, next) => {
    const reviews = await Review.find({ user: req.user.id })
        .select('-user')
        .populate('tour');
    res.status(200).render('review', {
        title: 'My Reviews',
        reviews
    });
});

exports.getFavorites = catchAsync(async (req, res, next) => {
    const favoriteTours = await User.findById(req.user.id).select('favorite');
    res.status(200).render('overview', {
        title: 'My Favorites',
        tours: favoriteTours.favorite
    });
});