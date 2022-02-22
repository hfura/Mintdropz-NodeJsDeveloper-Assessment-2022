const multer = require('multer');
const sharp = require('sharp');
const slugify = require('slugify');
const Post = require('../models/postModel');
const User = require('../models/userModel');
const Comment = require('../models/commentModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');
const filterObj = require('../utils/filterObj');

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images.', 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter
});

exports.uploadPostImages = upload.fields([{ name: 'images', maxCount: 4 }]);

exports.resizePostImages = catchAsync(async (req, res, next) => {
  if (!req.files.images) return next();

  req.body.images = [];

  await Promise.all(
    req.files.images.map(async (file, i) => {
      const filename = `post-${slugify(`${req.body.title}`, {
        lower: true
      })}-${Date.now()}-${i + 1}.jpeg`;

      await sharp(file.buffer)
        // .resize(2000, 1333) or resize on frontend?
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/posts/${filename}`);

      req.body.images.push(filename);
    })
  );

  next();
});

exports.filterBody = catchAsync(async (req, res, next) => {
  // filtering unwanted data from body, leaving image, title&desc only
  const filteredBody = filterObj(req.body, 'image', 'title', 'description');
  req.body = filteredBody;
  next();
});

exports.verifyIsOwner = catchAsync(async (req, res, next) => {
  const post = await Post.findById(req.params.id);
  if (!post) {
    return next(new AppError('No post found with that ID', 404));
  }

  if (req.user.id.toString() !== post.user._id.toString()) {
    return next(
      new AppError(
        'You do not have the rights to update or delete this post.',
        403
      )
    );
  }
  next();
});

exports.getTimelinePosts = catchAsync(async (req, res) => {
  const me = await User.findById(req.user.id).populate('following');
  //get ids of the users im following
  const { following } = me;
  const followingIds = [];
  following.forEach(e => {
    followingIds.push(e.userFollowed);
  });

  ///get posts made by me and users im following
  const posts = await Post.find({
    $or: [{ user: followingIds }, { user: me._id }]
  });

  res.status(200).json({
    status: 'success',
    requestedAt: req.requestTime,
    data: posts
  });
});

// DONE
exports.deletePost = catchAsync(async (req, res, next) => {
  await Post.findByIdAndUpdate(req.params.id, { deleted: true });
  //delete comments
  const postComments = await Comment.find({ post: req.params.id });
  await Promise.all(
    postComments.map(async comment => {
      await Comment.findByIdAndUpdate(comment._id, { deleted: true });
    })
  );

  res.status(204).json({
    status: 'success',
    requestedAt: req.requestTime,
    data: null
  });
});
exports.createPost = factory.createOne(Post);
exports.getAllPosts = factory.getAll(Post);
exports.getPost = factory.getOne(Post, 'comments');
exports.updatePost = factory.updateOne(Post);
