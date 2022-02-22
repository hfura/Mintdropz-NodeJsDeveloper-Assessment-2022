/* eslint-disable eqeqeq */
const Like = require('../models/likeModel');
const Post = require('../models/postModel');
const Comment = require('../models/commentModel');
const User = require('../models/userModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const Email = require('../utils/email');
const factory = require('./handlerFactory');
const filterObj = require('../utils/filterObj');

const verifyFields = (req, next) => {
  if (!req.body.comment && !req.body.post) {
    return next(
      new AppError('A like must belong to either a post or an comment!', 403)
    );
  }
  if (req.body.comment && req.body.post) {
    return next(
      new AppError('Can not like to a post and an comment at once.', 403)
    );
  }
};

exports.filterBody = catchAsync(async (req, res, next) => {
  // filtering unwanted data from body, leaving likeType only
  const filteredBody = filterObj(req.body, 'likeType');
  req.body = filteredBody;

  next();
});

exports.verifyIsOwner = catchAsync(async (req, res, next) => {
  verifyFields(req, next);
  //
  const like = await Like.findOne({
    $or: [{ post: req.body.post }, { comment: req.body.comment }]
  });

  if (!like) {
    return next(new AppError('There is no like for that post/comment!', 404));
  }

  if (req.user.id != like.user._id) {
    return next(
      new AppError(
        'You do not have the rights to update or delete this like.',
        403
      )
    );
  }
  next();
});

// DONE
exports.createLike = catchAsync(async (req, res, next) => {
  verifyFields(req, next);
  // find likes on that post or comment
  const likes = await Like.find({
    $or: [{ post: req.body.post }, { comment: req.body.comment }]
  });

  // find users that liked
  const usersThatLiked = [];
  likes.forEach((el, i) => {
    usersThatLiked[i] = el.user.toString();
  });

  // verify if user didnt like yet
  if (usersThatLiked.includes(req.body.user.toString())) {
    return next(
      new AppError('Can not like to a post or an comment more than once.', 403)
    );
  }

  // if not then
  const newLike = await Like.create({
    post: req.body.post,
    likeType: req.body.likeType,
    user: req.body.user,
    comment: req.body.comment
  });

  //find the owner of the post/comment
  let post;
  let comment;

  if (newLike.post) post = await Post.findById(newLike.post);
  else comment = await Comment.findById(newLike.comment);

  const user = post ? post.user : comment.user;
  const actualUser = await User.findById(newLike.user)
  //verify if owner of the post/like is not the same as the like
  if (user.id.toString() !== newLike.user.toString()) {
    //url of this post
    const url = newLike.post
      ? `https://deployeddns.herokuapp.com/api/v1/posts/${post._id}`
      : `https://deployeddns.herokuapp.com/api/v1/comments/${comment._id}`;

    //notify owner about new comment to his post
    if (newLike.post)
      await new Email(user, url, actualUser).sendNotificationNewLikeOnPost();
    else await new Email(user, url, actualUser).sendNotificationNewLikeOnComment();
  }

  res.status(201).json({
    status: 'success',
    requestedAt: req.requestTime,
    data: newLike
  });
});

exports.getLike = factory.getOne(Like);
exports.getAllLikes = factory.getAll(Like);
exports.updateLike = factory.updateOne(Like);
exports.deleteLike = factory.deleteOne(Like);
