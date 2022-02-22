const mongoose = require('mongoose');
const slugify = require('slugify');
const User = require('./userModel');

const postSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'A post must have a title!']
    },
    description: {
      type: String,
      required: [true, 'A post must have a deescription!']
    },
    images: [String],
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'A post must belong to a user!']
    },
    commentsQuantity: {
      type: Number,
      default: 0
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

// VIRTUAL POPULATE
postSchema.virtual('comments', {
  ref: 'Comment',
  foreignField: 'post',
  localField: '_id',
  match: { deleted: { $ne: true } }
});

postSchema.pre('save', function(next) {
  this.slug = slugify(`${this.title}${Date.now()}`, {
    lower: true
  });
  next();
});
postSchema.pre(/^find/, function(next) {
  this.find({ deleted: { $ne: true } }).sort({ createdAt: -1 });
  this.populate({
    path: 'user',
    select: 'name username email'
  });
  next();
});

postSchema.statics.calcUserTotalPosts = async function(userId) {
  console.log('calcUserTotalPosts')
  const stats = await this.aggregate([
    {
      $match: { $and: [{ user: userId }, { deleted: { $ne: false } }] }
    },
    {
      $group: {
        _id: '$user',
        nPosts: { $sum: 1 }
      }
    }
  ]);

  if (stats.length > 0) {
    await User.findByIdAndUpdate(userId, {
      postsQuantity: stats[0].nPosts
    });
  }
};

postSchema.post('save', function() {
  // this points to current like
  this.constructor.calcUserTotalPosts(this.user);
});

// findByIdAndUpdate
// findByIdAndDelete
postSchema.pre(/^findByIdAnd/, async function(next) {
  this.p = await this.findOne();
  next();
});

postSchema.post(/^findByIdAnd/, async function() {
  await this.p.constructor.calcUserTotalPosts(this.p.user);
});

const Post = mongoose.model('Post', postSchema);

module.exports = Post;
