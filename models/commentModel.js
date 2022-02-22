const mongoose = require('mongoose');
const Post = require('./postModel');

const commentSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: [true, 'A comment must have a text!']
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'A comment must belong to a user!']
    },
    post: {
      type: mongoose.Schema.ObjectId,
      ref: 'Post',
      required: [true, 'A comment must belong to a post!']
    },
    likesQuantity: {
      type: Number,
      default: 0
    },
    deslikesQuantity: {
      type: Number,
      default: 0
    },
    slug: String,
    deleted: {
      type: Boolean,
      default: false,
      select: false
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

commentSchema.virtual('likes', {
  ref: 'Like',
  foreignField: 'comment',
  localField: '_id',
  match: { deleted: { $ne: true } }
});

// QUERY MIDDLEWARE
commentSchema.pre(/^find/, function(next) {
  this.find({ deleted: { $ne: true } }).sort({ createdAt: -1 });

  this.populate({
    path: 'user',
    select: 'name username email'
  });
  next();
});

commentSchema.statics.calcPostTotalComments = async function(id) {
  const commentStats = await this.aggregate([
    {
      $match: { post: id }
    },
    {
      $group: {
        _id: '$post',
        nFollowing: { $sum: 1 }
      }
    }
  ]);

  // console.log(followStats);

  if (commentStats.length > 0) {
    await Post.findByIdAndUpdate(id, {
      likesQuantity: commentStats[0].nFollowing
    });
  }
};

commentSchema.post('save', function() {
  // this points to current like
  this.constructor.calcPostTotalComments(this.post);
});

// findByIdAndUpdate
// findByIdAndDelete
commentSchema.pre(/^findByIdAnd/, async function(next) {
  this.c = await this.findOne();
  // console.log(this.c);
  next();
});

commentSchema.post(/^findByIdAnd/, async function() {
  await this.c.constructor.calcPostTotalComments(this.c.post);
});

const Comment = mongoose.model('Comment', commentSchema);

module.exports = Comment;
