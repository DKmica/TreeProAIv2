const express = require('express');
const router = express.Router();
const contactsController = require('../controllers/contactsController');
const { requirePermission, RESOURCES, ACTIONS } = require('../auth');

router.get('/clients/:clientId/contacts', 
  requirePermission(RESOURCES.CONTACTS, ACTIONS.LIST),
  contactsController.getContactsByClient
);

router.post('/clients/:clientId/contacts', 
  requirePermission(RESOURCES.CONTACTS, ACTIONS.CREATE),
  contactsController.createContact
);

router.get('/contacts/:id', 
  requirePermission(RESOURCES.CONTACTS, ACTIONS.READ),
  contactsController.getContact
);

router.put('/contacts/:id', 
  requirePermission(RESOURCES.CONTACTS, ACTIONS.UPDATE),
  contactsController.updateContact
);

router.delete('/contacts/:id', 
  requirePermission(RESOURCES.CONTACTS, ACTIONS.DELETE),
  contactsController.deleteContact
);

router.post('/contacts/:contactId/channels', 
  requirePermission(RESOURCES.CONTACTS, ACTIONS.CREATE),
  contactsController.createContactChannel
);

router.delete('/contact-channels/:id', 
  requirePermission(RESOURCES.CONTACTS, ACTIONS.DELETE),
  contactsController.deleteContactChannel
);

module.exports = router;
