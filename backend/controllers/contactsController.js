const contactService = require('../services/contactService');
const { handleError } = require('../utils/errors');

const getContactsByClient = async (req, res) => {
  try {
    const { clientId } = req.params;
    const contacts = await contactService.getContactsByClientId(clientId);
    res.json({ success: true, data: contacts });
  } catch (err) {
    handleError(res, err);
  }
};

const createContact = async (req, res) => {
  try {
    const { clientId } = req.params;
    const contactData = req.body;
    const contact = await contactService.createContact(clientId, contactData);
    res.status(201).json({ success: true, data: contact });
  } catch (err) {
    handleError(res, err);
  }
};

const getContact = async (req, res) => {
  try {
    const { id } = req.params;
    const contact = await contactService.getContactById(id);
    res.json({ success: true, data: contact });
  } catch (err) {
    handleError(res, err);
  }
};

const updateContact = async (req, res) => {
  try {
    const { id } = req.params;
    const contactData = req.body;
    const contact = await contactService.updateContact(id, contactData);
    res.json({ success: true, data: contact });
  } catch (err) {
    handleError(res, err);
  }
};

const deleteContact = async (req, res) => {
  try {
    const { id } = req.params;
    await contactService.deleteContact(id);
    res.status(204).send();
  } catch (err) {
    handleError(res, err);
  }
};

const createContactChannel = async (req, res) => {
  try {
    const { contactId } = req.params;
    const channelData = req.body;
    const channel = await contactService.createContactChannel(contactId, channelData);
    res.status(201).json({ success: true, data: channel });
  } catch (err) {
    handleError(res, err);
  }
};

const deleteContactChannel = async (req, res) => {
  try {
    const { id } = req.params;
    await contactService.deleteContactChannel(id);
    res.status(204).send();
  } catch (err) {
    handleError(res, err);
  }
};

module.exports = {
  getContactsByClient,
  createContact,
  getContact,
  updateContact,
  deleteContact,
  createContactChannel,
  deleteContactChannel,
};
