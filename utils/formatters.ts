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

// Parse equipment input - split by comma only, allowing spaces within items
export const parseEquipment = (input: string): string[] => {
  return input
    .split(',')
    .map(item => item.trim())
    .filter(item => item.length > 0);
};

// Lookup city and state from zip code (basic US database)
export const lookupZipCode = (zip: string): { city: string; state: string } | null => {
  const cleaned = zip.replace(/\D/g, '').slice(0, 5);
  if (cleaned.length !== 5) return null;

  // Basic US zip code database - most common prefixes
  const zipDatabase: { [key: string]: { city: string; state: string } } = {
    '10001': { city: 'New York', state: 'NY' },
    '10002': { city: 'New York', state: 'NY' },
    '10003': { city: 'New York', state: 'NY' },
    '90001': { city: 'Los Angeles', state: 'CA' },
    '90002': { city: 'Los Angeles', state: 'CA' },
    '60601': { city: 'Chicago', state: 'IL' },
    '77001': { city: 'Houston', state: 'TX' },
    '75201': { city: 'Dallas', state: 'TX' },
    '85001': { city: 'Phoenix', state: 'AZ' },
    '19101': { city: 'Philadelphia', state: 'PA' },
  };

  return zipDatabase[cleaned] || null;
};
