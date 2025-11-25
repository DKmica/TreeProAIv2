const handleError = (res, err) => {
  console.error(err);
  
  if (err.statusCode) {
    return res.status(err.statusCode).json({ 
      error: err.message,
      details: err.details || err.message 
    });
  }
  
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
};

const createError = (statusCode, message, details = null) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.details = details;
  return error;
};

const notFoundError = (resource = 'Resource') => {
  return createError(404, `${resource} not found`);
};

const badRequestError = (message, details = null) => {
  return createError(400, message, details);
};

const unauthorizedError = (message = 'Unauthorized') => {
  return createError(401, message);
};

const validationError = (message, fields = {}) => {
  return createError(422, message, fields);
};

module.exports = {
  handleError,
  createError,
  notFoundError,
  badRequestError,
  unauthorizedError,
  validationError,
};
