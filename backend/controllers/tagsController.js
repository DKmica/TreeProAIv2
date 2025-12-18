const { handleError, badRequestError, notFoundError } = require('../utils/errors');
const tagService = require('../services/tagService');

const getTags = async (req, res) => {
  try {
    const { category } = req.query;
    
    const tags = await tagService.getAllTags(category);
    
    res.json({ success: true, data: tags });
  } catch (err) {
    handleError(res, err);
  }
};

const createTag = async (req, res) => {
  try {
    const { name, color, description, category } = req.body;
    
    if (!name || name.trim() === '') {
      throw badRequestError('Tag name is required');
    }
    
    const tag = await tagService.createTag({ name, color, description, category });
    
    res.status(201).json({ success: true, data: tag });
  } catch (err) {
    if (err.message === 'Tag name must be unique (case-insensitive)') {
      return res.status(400).json({ 
        success: false, 
        error: err.message 
      });
    }
    handleError(res, err);
  }
};

const updateTag = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, color, description, category } = req.body;
    
    const tag = await tagService.updateTag(id, { name, color, description, category });
    
    if (!tag) {
      throw notFoundError('Tag');
    }
    
    res.json({ success: true, data: tag });
  } catch (err) {
    if (err.message === 'Tag name must be unique (case-insensitive)') {
      return res.status(400).json({ 
        success: false, 
        error: err.message 
      });
    }
    if (err.message === 'No valid fields to update') {
      return res.status(400).json({ 
        success: false, 
        error: err.message 
      });
    }
    handleError(res, err);
  }
};

const deleteTag = async (req, res) => {
  try {
    const { id } = req.params;
    
    const deleted = await tagService.deleteTag(id);
    
    if (!deleted) {
      throw notFoundError('Tag');
    }
    
    res.status(204).send();
  } catch (err) {
    handleError(res, err);
  }
};

const addTagsToEntity = async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const { tagIds, tagNames } = req.body;
    
    if (!tagService.validateEntityType(entityType)) {
      throw badRequestError(`Invalid entity type. Must be one of: client, property, quote, job, lead`);
    }
    
    const entityExists = await tagService.validateEntityExists(entityType, entityId);
    if (!entityExists) {
      return res.status(404).json({ 
        success: false, 
        error: `${entityType} not found` 
      });
    }
    
    const tags = await tagService.addTagsToEntity(entityType, entityId, tagIds, tagNames);
    
    res.json({ success: true, data: tags });
  } catch (err) {
    handleError(res, err);
  }
};

const getEntityTags = async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    
    if (!tagService.validateEntityType(entityType)) {
      throw badRequestError(`Invalid entity type. Must be one of: client, property, quote, job, lead`);
    }
    
    const entityExists = await tagService.validateEntityExists(entityType, entityId);
    if (!entityExists) {
      return res.status(404).json({ 
        success: false, 
        error: `${entityType} not found` 
      });
    }
    
    const tags = await tagService.getEntityTags(entityType, entityId);
    
    res.json({ success: true, data: tags });
  } catch (err) {
    handleError(res, err);
  }
};

const removeTagFromEntity = async (req, res) => {
  try {
    const { entityType, entityId, tagId } = req.params;
    
    if (!tagService.validateEntityType(entityType)) {
      throw badRequestError(`Invalid entity type. Must be one of: client, property, quote, job, lead`);
    }
    
    const entityExists = await tagService.validateEntityExists(entityType, entityId);
    if (!entityExists) {
      return res.status(404).json({ 
        success: false, 
        error: `${entityType} not found` 
      });
    }
    
    const removed = await tagService.removeTagFromEntity(entityType, entityId, tagId);
    
    if (!removed) {
      return res.status(404).json({ 
        success: false, 
        error: 'Tag association not found' 
      });
    }
    
    res.status(204).send();
  } catch (err) {
    handleError(res, err);
  }
};

module.exports = {
  getTags,
  createTag,
  updateTag,
  deleteTag,
  addTagsToEntity,
  getEntityTags,
  removeTagFromEntity,
};
