const mongoose = require('mongoose');
const Comment = require('./commentModel');
const Post = require('./postModel');

const likeSchema = new mongoose.Schema(
  {
    likeType: {
      type: String,
      required: [true, 'A Like must have a likeType!'],
      enum: {
        values: ['like', 'dislike'],
        message: 'Like likeType must be either: like or dislike.'
      }
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'A Like must have a user!']
    },
    comment: {
      type: mongoose.Schema.ObjectId,
      ref: 'Comment'
    },
    post: {
      type: mongoose.Schema.ObjectId,
      ref: 'Post'
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

likeSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'user',
    select: 'name image'
  });
  next();
});

likeSchema.statics.calcPostTotalLikes = async function(id) {
  const likeStats = await this.aggregate([
    {
      $match: { $and: [{ post: id }, { type: 'like' }] }
    },
    {
      $group: {
        _id: '$post',
        nlikes: { $sum: 1 }
      }
    }
  ]);

  const deslikeStats = await this.aggregate([
    {
      $match: { $and: [{ post: id }, { type: 'deslike' }] }
    },
    {
      $group: {
        _id: '$post',
        nDeslikes: { $sum: 1 }
      }
    }
  ]);
  // console.log(likeStats, deslikeStats);

  if (likeStats.length > 0) {
    await Post.findByIdAndUpdate(id, {
      likesQuantity: likeStats[0].nlikes
    });
  } else if (deslikeStats.length > 0) {
    await Post.findByIdAndUpdate(id, {
      deslikesQuantity: deslikeStats[0].nDeslikes
    });
  }
};

likeSchema.statics.calcCommentTotalLikes = async function(id) {
  const likeStats = await this.aggregate([
    {
      $match: { $and: [{ comment: id }, { type: 'like' }] }
    },
    {
      $group: {
        _id: '$comment',
        nlikes: { $sum: 1 }
      }
    }
  ]);

  const deslikeStats = await this.aggregate([
    {
      $match: { $and: [{ comment: id }, { type: 'deslike' }] }
    },
    {
      $group: {
        _id: '$comment',
        nDeslikes: { $sum: 1 }
      }
    }
  ]);
  // console.log(likeStats, deslikeStats);

  if (likeStats.length > 0) {
    await Comment.findByIdAndUpdate(id, {
      likesQuantity: likeStats[0].nlikes
    });
  } else if (deslikeStats.length > 0) {
    await Comment.findByIdAndUpdate(id, {
      deslikesQuantity: deslikeStats[0].nDeslikes
    });
  }
};

likeSchema.post('save', function() {
  // this points to current like
  this.constructor.calcPostTotalLikes(this.post);
  this.constructor.calcCommentTotalLikes(this.comment);
});

// findByIdAndUpdate
// findByIdAndDelete
likeSchema.pre(/^findByIdAnd/, async function(next) {
  this.r = await this.findOne();
  // console.log(this.r);
  next();
});

likeSchema.post(/^findByIdAnd/, async function() {
  await this.r.constructor.calcPostTotalLikes(this.r.post);
  await this.r.constructor.calcCommentTotalLikes(this.r.comment);
});

const Like = mongoose.model('Like', likeSchema);

module.exports = Like;
