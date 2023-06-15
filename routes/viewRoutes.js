const express = require('express');
const viewController = require('../controllers/viewController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(viewController.alerts)

// routes
router.get(
    '/',
    authController.isLoggedIn,
    viewController.getOverview
);
router.get('/tour/:slug', authController.isLoggedIn, viewController.getTour);
router.get('/login', authController.isLoggedIn, viewController.getLoginForm);
router.get('/signup', viewController.getSignupForm);
router.get('/me', authController.protect, viewController.getAccount);
router.get('/my-tours', authController.protect, viewController.getMyTours);
router.get('/my-reviews', authController.protect, viewController.getMyReviews);
router.get(
    '/my-favorite-tours',
    authController.protect,
    viewController.getFavorites
);
router.post(
    '/submit-user-data',
    authController.protect,
    viewController.updateUserData
);

module.exports = router;
