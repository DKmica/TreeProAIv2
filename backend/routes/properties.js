const express = require('express');
const propertiesController = require('../controllers/propertiesController');
const { requirePermission, RESOURCES, ACTIONS } = require('../auth');

const router = express.Router();

router.get('/clients/:clientId/properties', 
  requirePermission(RESOURCES.PROPERTIES, ACTIONS.LIST),
  propertiesController.getPropertiesByClientId
);

router.post('/clients/:clientId/properties', 
  requirePermission(RESOURCES.PROPERTIES, ACTIONS.CREATE),
  propertiesController.createProperty
);

router.get('/properties/:id', 
  requirePermission(RESOURCES.PROPERTIES, ACTIONS.READ),
  propertiesController.getPropertyById
);

router.put('/properties/:id', 
  requirePermission(RESOURCES.PROPERTIES, ACTIONS.UPDATE),
  propertiesController.updateProperty
);

router.delete('/properties/:id', 
  requirePermission(RESOURCES.PROPERTIES, ACTIONS.DELETE),
  propertiesController.deleteProperty
);

module.exports = router;
