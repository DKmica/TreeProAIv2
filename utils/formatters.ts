// Format phone number: (555) 123-4567
export const formatPhone = (value: string): string => {
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length === 0) return '';
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
  return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
};

// Format zip code: 12345
export const formatZip = (value: string): string => {
  const cleaned = value.replace(/\D/g, '');
  return cleaned.slice(0, 5);
};

// Format currency: $1,234.56
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
};

// Format SSN: 123-45-6789
export const formatSSN = (value: string): string => {
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length === 0) return '';
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 5) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5, 9)}`;
};

// Format state code to uppercase
export const formatState = (value: string): string => {
  return value.toUpperCase().slice(0, 2);
};

// Parse phone number from formatted string
export const parsePhone = (formatted: string): string => {
  return formatted.replace(/\D/g, '');
};
