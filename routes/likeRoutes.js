const express = require('express');

const likeController = require('../controllers/likeController');
const authController = require('../controllers/authController');

const router = express.Router({ mergeParams: true });

router.use(authController.protect);

router
  .route('/')
  .get(likeController.getAllLikes)
  .post(likeController.createLike);

router
  .route('/:id')
  .get(likeController.getLike)
  .patch(
    likeController.verifyIsOwner,
    likeController.filterBody,
    likeController.updateLike
  ).delete(likeController.verifyIsOwner, likeController.deleteLike);

module.exports = router;
