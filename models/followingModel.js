const mongoose = require('mongoose');
const User = require('./userModel');

const followingSchema = new mongoose.Schema(
  {
    userFollowing: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'A following must have a userFollowing']
    },
    userFollowed: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'A following must have a userFollowed']
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);
followingSchema.index({ userFollowing: 1, userFollowed: 1 }, { unique: true });

followingSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'userFollowing',
    select: 'name username'
  }).populate({
    path: 'userFollowed',
    select: 'name username'
  });
  next();
});

followingSchema.statics.calcUserTotalFollowings = async function(userId) {
  const followingStats = await this.aggregate([
    {
      $match: { userFollowing: userId }
    },
    {
      $group: {
        _id: '$user',
        nFollowing: { $sum: 1 }
      }
    }
  ]);

  const followersStats = await this.aggregate([
    {
      $match: { userFollowed: userId }
    },
    {
      $group: {
        _id: '$user',
        nFollowers: { $sum: 1 }
      }
    }
  ]);
  // console.log(followStats, deslikeStats);

  if (followingStats.length > 0) {
    await User.findByIdAndUpdate(userId, {
      followingQuantity: followingStats[0].nFollowing
    });
  } else if (followersStats.length > 0) {
    await User.findByIdAndUpdate(userId, {
      followersQuantity: followersStats[0].nFollowers
    });
  }
};

followingSchema.post('save', function() {
  // this points to current like
  this.constructor.calcUserTotalFollowings(this.user);
});

// findByIdAndUpdate
// findByIdAndDelete
followingSchema.pre(/^findByIdAnd/, async function(next) {
  this.f = await this.findOne();
  // console.log(this.f);
  next();
});

followingSchema.post(/^findByIdAnd/, async function() {
  await this.f.constructor.calcUserTotalFollowings(this.f.user);
});

const Following = mongoose.model('Following', followingSchema);

module.exports = Following;
