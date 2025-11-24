const handleError = (res, err) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
};

module.exports = { handleError };
