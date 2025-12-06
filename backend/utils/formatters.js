const snakeToCamel = (obj) => {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(snakeToCamel);
  if (typeof obj !== 'object') return obj;
  
  // Don't transform Date objects, Buffer, or other special types
  if (obj instanceof Date) return obj;
  if (Buffer.isBuffer(obj)) return obj;
  if (obj.constructor && obj.constructor.name !== 'Object') return obj;

  const camelObj = {};
  for (const [key, value] of Object.entries(obj)) {
    let camelKey;
    if (key === 'zip_code') {
      camelKey = 'zipCode';
    } else if (key === 'billing_zip_code') {
      camelKey = 'billingZipCode';
    } else {
      camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    }
    // Preserve Date objects, Buffers, and other special types
    if (value instanceof Date || Buffer.isBuffer(value)) {
      camelObj[camelKey] = value;
    } else if (value && typeof value === 'object') {
      // Check if it's a plain object before recursing
      if (value.constructor && value.constructor.name !== 'Object' && !Array.isArray(value)) {
        camelObj[camelKey] = value;
      } else {
        camelObj[camelKey] = snakeToCamel(value);
      }
    } else {
      camelObj[camelKey] = value;
    }
  }
  return camelObj;
};

const camelToSnake = (obj) => {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(camelToSnake);
  if (typeof obj !== 'object') return obj;
  
  // Don't transform Date objects, Buffer, or other special types
  if (obj instanceof Date) return obj;
  if (Buffer.isBuffer(obj)) return obj;
  if (obj.constructor && obj.constructor.name !== 'Object') return obj;

  const snakeObj = {};
  for (const [key, value] of Object.entries(obj)) {
    let snakeKey;
    if (key === 'zipCode') {
      snakeKey = 'zip_code';
    } else if (key === 'billingZipCode') {
      snakeKey = 'billing_zip_code';
    } else if (key === 'email' || key === 'phone' || key === 'role') {
      continue;
    } else {
      snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    }
    // Preserve Date objects, Buffers, and other special types
    if (value instanceof Date || Buffer.isBuffer(value)) {
      snakeObj[snakeKey] = value;
    } else if (value && typeof value === 'object') {
      if (value.constructor && value.constructor.name !== 'Object' && !Array.isArray(value)) {
        snakeObj[snakeKey] = value;
      } else {
        snakeObj[snakeKey] = camelToSnake(value);
      }
    } else {
      snakeObj[snakeKey] = value;
    }
  }
  return snakeObj;
};

const sanitizeUUID = (value) => {
  if (!value || value === 'undefined' || value === 'null' || value === '') {
    return null;
  }
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(value)) {
    return null;
  }
  return value;
};

module.exports = {
  camelToSnake,
  snakeToCamel,
  sanitizeUUID,
};
