const express = require('express');
const postController = require('../controllers/postController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect);
router
  .route('/')
  .get(postController.getAllPosts)
  .post(
    postController.uploadPostImages,
    postController.resizePostImages,
    postController.createPost
  );

router.route('/timeline').get(postController.getTimelinePosts);

router
  .route('/:id')
  .get(postController.getPost)
  .patch(
    postController.verifyIsOwner,
    postController.filterBody,
    postController.uploadPostImages,
    postController.resizePostImages,
    postController.updatePost
  )
  .delete(postController.verifyIsOwner, postController.deletePost);

module.exports = router;
