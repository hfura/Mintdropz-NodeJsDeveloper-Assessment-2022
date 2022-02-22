/* eslint-disable eqeqeq */
const Comment = require('../models/commentModel');
const Post = require('../models/postModel');
const User = require('../models/userModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');
const Email = require('../utils/email');
const filterObj = require('../utils/filterObj');

// DONE
exports.filterBody = catchAsync(async (req, res, next) => {
  // filtering unwanted data from body, leaving text only
  const filteredBody = filterObj(req.body, 'text');
  req.body = filteredBody;

  next();
});

exports.verifyIsOwner = catchAsync(async (req, res, next) => {
  const comment = await Comment.findById(req.params.id);
  if (!comment) {
    return next(new AppError('No comment found with that ID', 404));
  }

  if (req.user.id != comment.user._id) {
    return next(
      new AppError(
        'You do not have the rights to update or delete this comment.',
        403
      )
    );
  }
  next();
});

exports.createComment = factory.createOne(Comment, async comment => {
  //find the owner of the post
  const post = await Post.findById(comment.post);
  const { user } = post;
  const actualUser = await User.findById(comment.user);
  //verify if owner of the post is not the same as the comment
  if (user.id !== comment.user) {
    //url of this post
    const url = `https://md-nodejsdev-helton-furau.herokuapp.com/api/v1/posts/${post._id}`;
    //notify owner about new comment to his post
    await new Email(user, url, actualUser).sendNotificationNewCommentOnPost();
  }
});

exports.getAllComments = factory.getAll(Comment, 'likes');
exports.updateComment = factory.updateOne(Comment);
exports.getComment = factory.getOne(Comment, 'likes');
exports.deleteComment = factory.deleteOne(Comment);
