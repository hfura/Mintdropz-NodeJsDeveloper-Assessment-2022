const express = require('express');
const authController = require('../controllers/authController');
const followingController = require('../controllers/followingController');

const router = express.Router();

router.use(authController.protect);

router.route('/follow').post(followingController.follow);

router.route('/unfollow').post(followingController.unfollow);

module.exports = router;
