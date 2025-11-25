const express = require('express');
const router = express.Router();
const {
  getTags,
  createTag,
  updateTag,
  deleteTag,
  addTagsToEntity,
  getEntityTags,
  removeTagFromEntity,
} = require('../controllers/tagsController');

router.get('/tags', getTags);
router.post('/tags', createTag);
router.put('/tags/:id', updateTag);
router.delete('/tags/:id', deleteTag);

router.post('/entities/:entityType/:entityId/tags', addTagsToEntity);
router.get('/entities/:entityType/:entityId/tags', getEntityTags);
router.delete('/entities/:entityType/:entityId/tags/:tagId', removeTagFromEntity);

module.exports = router;
