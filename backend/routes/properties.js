const express = require('express');
const propertiesController = require('../controllers/propertiesController');

const router = express.Router();

router.get('/clients/:clientId/properties', propertiesController.getPropertiesByClientId);
router.post('/clients/:clientId/properties', propertiesController.createProperty);
router.get('/properties/:id', propertiesController.getPropertyById);
router.put('/properties/:id', propertiesController.updateProperty);
router.delete('/properties/:id', propertiesController.deleteProperty);

module.exports = router;
