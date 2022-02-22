const express = require('express');
const commentController = require('../controllers/commentController');
const authController = require('../controllers/authController');

const router = express.Router();
router.use(authController.protect);

router
  .route('/')
  .get(commentController.getAllComments)
  .post(commentController.createComment);

router
  .route('/:id')
  .get(commentController.getComment)
  .patch(
    commentController.verifyIsOwner,
    commentController.filterBody,
    commentController.updateComment
  )
  .delete(commentController.verifyIsOwner, commentController.deleteComment);

module.exports = router;
