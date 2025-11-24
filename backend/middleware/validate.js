const { validationResult } = require('express-validator');

function validateRequest(validations) {
  return async (req, res, next) => {
    try {
      await Promise.all(validations.map(validation => validation.run(req)));

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { validateRequest };
