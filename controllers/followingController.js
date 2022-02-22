const Following = require('../models/followingModel');
const User = require('../models/userModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const Email = require('../utils/email');

exports.follow = catchAsync(async (req, res, next) => {
  if (!req.body.userFollowing || !req.body.userFollowed) {
    return next(
      new AppError('You must provide a userFollowing and a userFollowed!', 403)
    );
  }

  if (req.body.userFollowing === req.body.userFollowed) {
    return next(new AppError('You can not follow yourself.', 403));
  }

  let newFollowing;
  try {
    newFollowing = await Following.create({
      userFollowing: req.body.userFollowing,
      userFollowed: req.body.userFollowed
    });
  } catch (err) {
    return next(new AppError('You can not follow the same user twice', 403));
  }

  //notify followed user about new follower
  const followed = await User.findById(req.body.userFollowed);
  const follower = await User.findById(req.body.userFollowing);

  const url = `${req.get('host')}/users/${follower.username}`;
  await new Email(followed, url, follower).sendNotificationNewFollower();

  res.status(201).json({
    status: 'success',
    requestedAt: req.requestTime,
    data: newFollowing
  });

});

exports.unfollow = catchAsync(async (req, res, next) => {
  if (!req.body.userFollowing || !req.body.userFollowed) {
    return next(
      new AppError('You must provide a userFollowing and a userFollowed!', 403)
    );
  }

  const $following = await Following.findOne({
    userFollowing: req.body.userFollowing,
    userFollowed: req.body.userFollowed
  });
  if (!$following) {
    return next(
      new AppError(
        'You can not unfollow a user that you are not following.',
        403
      )
    );
  }

  await Following.findOneAndDelete({
    userFollowing: req.body.userFollowing,
    userFollowed: req.body.userFollowed
  });

  res.status(204).json({
    status: 'success',
    requestedAt: req.requestTime,
    data: null
  });
});
