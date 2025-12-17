const { randomUUID } = require('crypto');

module.exports = {
  v4: () => (typeof randomUUID === 'function' ? randomUUID() : 'mock-uuid'),
};
