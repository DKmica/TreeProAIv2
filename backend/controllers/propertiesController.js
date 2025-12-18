const propertyService = require('../services/propertyService');
const { handleError } = require('../utils/errors');

class PropertiesController {
  async getPropertiesByClientId(req, res) {
    try {
      const { clientId } = req.params;
      const properties = await propertyService.getPropertiesByClientId(clientId);
      
      res.json({ 
        success: true, 
        data: properties 
      });
    } catch (err) {
      handleError(res, err);
    }
  }

  async createProperty(req, res) {
    try {
      const { clientId } = req.params;
      const propertyData = req.body;
      
      const property = await propertyService.createProperty(clientId, propertyData);
      
      res.status(201).json({ 
        success: true, 
        data: property 
      });
    } catch (err) {
      handleError(res, err);
    }
  }

  async getPropertyById(req, res) {
    try {
      const { id } = req.params;
      const property = await propertyService.getPropertyById(id);
      
      res.json({ 
        success: true, 
        data: property 
      });
    } catch (err) {
      handleError(res, err);
    }
  }

  async updateProperty(req, res) {
    try {
      const { id } = req.params;
      const propertyData = req.body;
      
      const property = await propertyService.updateProperty(id, propertyData);
      
      res.json({ 
        success: true, 
        data: property 
      });
    } catch (err) {
      handleError(res, err);
    }
  }

  async deleteProperty(req, res) {
    try {
      const { id } = req.params;
      await propertyService.deleteProperty(id);
      
      res.status(204).send();
    } catch (err) {
      handleError(res, err);
    }
  }
}

module.exports = new PropertiesController();
