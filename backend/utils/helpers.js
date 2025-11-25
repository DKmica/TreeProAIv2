const normalizeText = (value) => {
  if (!value || typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeEmail = (value) => {
  const trimmed = normalizeText(value);
  return trimmed ? trimmed.toLowerCase() : null;
};

const normalizePhone = (value) => {
  if (!value) return null;
  const digits = value.toString().replace(/[^0-9]/g, '');
  return digits.length > 0 ? digits : null;
};

module.exports = {
  normalizeText,
  normalizeEmail,
  normalizePhone,
};
