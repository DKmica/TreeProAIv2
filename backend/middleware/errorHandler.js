function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Not Found' });
}

function errorHandler(err, req, res, next) {
  // eslint-disable-next-line no-console
  console.error('Unhandled error:', err);

  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({ error: message });
}

module.exports = { errorHandler, notFoundHandler };
