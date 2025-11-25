const express = require('express');
const router = express.Router();
const contactsController = require('../controllers/contactsController');

router.get('/clients/:clientId/contacts', contactsController.getContactsByClient);

router.post('/clients/:clientId/contacts', contactsController.createContact);

router.get('/contacts/:id', contactsController.getContact);

router.put('/contacts/:id', contactsController.updateContact);

router.delete('/contacts/:id', contactsController.deleteContact);

router.post('/contacts/:contactId/channels', contactsController.createContactChannel);

router.delete('/contact-channels/:id', contactsController.deleteContactChannel);

module.exports = router;
