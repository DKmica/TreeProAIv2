import React, { useState, useEffect } from 'react';
import { Property } from '../types';
import XIcon from './icons/XIcon';

interface PropertyEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (property: Property) => void;
  clientId: string;
  property?: Property;
}

interface FormData {
  propertyType: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  lat: string;
  lon: string;
  squareFootage: string;
  lotSize: string;
  gateCode: string;
  accessInstructions: string;
  isPrimary: boolean;
  parkingInstructions: string;
}

interface FormErrors {
  propertyType?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  lat?: string;
  lon?: string;
}

const PropertyEditor: React.FC<PropertyEditorProps> = ({ isOpen, onClose, onSave, clientId, property }) => {
  const [formData, setFormData] = useState<FormData>({
    propertyType: 'residential',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'USA',
    lat: '',
    lon: '',
    squareFootage: '',
    lotSize: '',
    gateCode: '',
    accessInstructions: '',
    isPrimary: false,
    parkingInstructions: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (property) {
      setFormData({
        propertyType: property.propertyType || 'residential',
        addressLine1: property.addressLine1 || '',
        addressLine2: property.addressLine2 || '',
        city: property.city || '',
        state: property.state || '',
        zipCode: property.zipCode || '',
        country: property.country || 'USA',
        lat: property.lat?.toString() || '',
        lon: property.lon?.toString() || '',
        squareFootage: property.squareFootage?.toString() || '',
        lotSize: property.lotSize?.toString() || '',
        gateCode: property.gateCode || '',
        accessInstructions: property.accessInstructions || '',
        isPrimary: property.isPrimary || false,
        parkingInstructions: property.parkingInstructions || '',
      });
    } else {
      setFormData({
        propertyType: 'residential',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'USA',
        lat: '',
        lon: '',
        squareFootage: '',
        lotSize: '',
        gateCode: '',
        accessInstructions: '',
        isPrimary: false,
        parkingInstructions: '',
      });
    }
    setErrors({});
    setApiError(null);
  }, [property, isOpen]);

  const validatePostalCode = (zip: string): boolean => {
    const usZipRegex = /^\d{5}(-\d{4})?$/;
    const canadaPostalRegex = /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/;
    return usZipRegex.test(zip) || canadaPostalRegex.test(zip);
  };

  const validateCoordinate = (value: string, type: 'lat' | 'lon'): boolean => {
    if (!value) return true;
    
    const num = parseFloat(value);
    if (isNaN(num)) return false;
    
    if (type === 'lat') {
      return num >= -90 && num <= 90;
    } else {
      return num >= -180 && num <= 180;
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.propertyType.trim()) {
      newErrors.propertyType = 'Property type is required';
    }

    if (!formData.addressLine1.trim()) {
      newErrors.addressLine1 = 'Street address is required';
    }

    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    }

    if (!formData.state.trim()) {
      newErrors.state = 'State/Province is required';
    }

    if (!formData.zipCode.trim()) {
      newErrors.zipCode = 'Postal code is required';
    } else if (!validatePostalCode(formData.zipCode)) {
      newErrors.zipCode = 'Invalid postal code format';
    }

    if (formData.lat && !validateCoordinate(formData.lat, 'lat')) {
      newErrors.lat = 'Latitude must be between -90 and 90';
    }

    if (formData.lon && !validateCoordinate(formData.lon, 'lon')) {
      newErrors.lon = 'Longitude must be between -180 and 180';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setApiError(null);

    try {
      const propertyData: Partial<Property> = {
        clientId,
        propertyType: formData.propertyType,
        addressLine1: formData.addressLine1,
        addressLine2: formData.addressLine2 || undefined,
        city: formData.city,
        state: formData.state,
        zip: formData.zipCode,
        country: formData.country,
        lat: formData.lat ? parseFloat(formData.lat) : undefined,
        lon: formData.lon ? parseFloat(formData.lon) : undefined,
        squareFootage: formData.squareFootage ? parseFloat(formData.squareFootage) : undefined,
        lotSize: formData.lotSize ? parseFloat(formData.lotSize) : undefined,
        gateCode: formData.gateCode || undefined,
        accessInstructions: formData.accessInstructions || undefined,
        parkingInstructions: formData.parkingInstructions || undefined,
        isPrimary: formData.isPrimary,
      };

      const url = property 
        ? `/api/properties/${property.id}`
        : `/api/clients/${clientId}/properties`;
      
      const method = property ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(propertyData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to save property: ${errorText}`);
      }

      const savedProperty: Property = await response.json();
      onSave(savedProperty);
      onClose();
    } catch (err: any) {
      console.error('Error saving property:', err);
      setApiError(err.message || 'Failed to save property');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const isFormValid = () => {
    if (!formData.propertyType.trim()) return false;
    if (!formData.addressLine1.trim()) return false;
    if (!formData.city.trim()) return false;
    if (!formData.state.trim()) return false;
    if (!formData.zipCode.trim()) return false;
    if (!validatePostalCode(formData.zipCode)) return false;
    if (formData.lat && !validateCoordinate(formData.lat, 'lat')) return false;
    if (formData.lon && !validateCoordinate(formData.lon, 'lon')) return false;
    return true;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
      onClick={handleOverlayClick}
    >
      <div
        className="relative bg-[#0f1c2e] rounded-lg shadow-xl w-[95vw] sm:w-full sm:max-w-2xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-700">
          <h2 className="text-lg sm:text-xl font-bold text-white">
            {property ? 'Edit Property' : 'Add Property'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
            type="button"
          >
            <XIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="px-4 sm:px-6 py-4 space-y-6">
            {apiError && (
              <div className="bg-red-900/30 border border-red-500 text-red-200 px-4 py-3 rounded">
                {apiError}
              </div>
            )}

            <div>
              <label htmlFor="propertyType" className="block text-sm font-medium text-gray-300 mb-1">
                Property Type <span className="text-red-400">*</span>
              </label>
              <select
                id="propertyType"
                name="propertyType"
                value={formData.propertyType}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              >
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
                <option value="municipal">Municipal</option>
                <option value="other">Other</option>
              </select>
              {errors.propertyType && (
                <p className="mt-1 text-sm text-red-400">{errors.propertyType}</p>
              )}
            </div>

            <div className="border-t border-gray-700 pt-6">
              <h3 className="text-lg font-semibold text-white mb-4">Service Address</h3>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="addressLine1" className="block text-sm font-medium text-gray-300 mb-1">
                    Street Address <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    id="addressLine1"
                    name="addressLine1"
                    value={formData.addressLine1}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    placeholder="123 Main St"
                  />
                  {errors.addressLine1 && (
                    <p className="mt-1 text-sm text-red-400">{errors.addressLine1}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="addressLine2" className="block text-sm font-medium text-gray-300 mb-1">
                    Address Line 2
                  </label>
                  <input
                    type="text"
                    id="addressLine2"
                    name="addressLine2"
                    value={formData.addressLine2}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    placeholder="Apt, Suite, etc."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="city" className="block text-sm font-medium text-gray-300 mb-1">
                      City <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      placeholder="City"
                    />
                    {errors.city && (
                      <p className="mt-1 text-sm text-red-400">{errors.city}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="state" className="block text-sm font-medium text-gray-300 mb-1">
                      State/Province <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      id="state"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      placeholder="State"
                    />
                    {errors.state && (
                      <p className="mt-1 text-sm text-red-400">{errors.state}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="zipCode" className="block text-sm font-medium text-gray-300 mb-1">
                      Postal Code <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      id="zipCode"
                      name="zipCode"
                      value={formData.zipCode}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      placeholder="12345"
                    />
                    {errors.zipCode && (
                      <p className="mt-1 text-sm text-red-400">{errors.zipCode}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="country" className="block text-sm font-medium text-gray-300 mb-1">
                      Country
                    </label>
                    <input
                      type="text"
                      id="country"
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      placeholder="USA"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="lat" className="block text-sm font-medium text-gray-300 mb-1">
                      Latitude (optional)
                    </label>
                    <input
                      type="text"
                      id="lat"
                      name="lat"
                      value={formData.lat}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      placeholder="e.g., 40.7128"
                    />
                    {errors.lat && (
                      <p className="mt-1 text-sm text-red-400">{errors.lat}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="lon" className="block text-sm font-medium text-gray-300 mb-1">
                      Longitude (optional)
                    </label>
                    <input
                      type="text"
                      id="lon"
                      name="lon"
                      value={formData.lon}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      placeholder="e.g., -74.0060"
                    />
                    {errors.lon && (
                      <p className="mt-1 text-sm text-red-400">{errors.lon}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-700 pt-6">
              <h3 className="text-lg font-semibold text-white mb-4">Property Details</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="squareFootage" className="block text-sm font-medium text-gray-300 mb-1">
                      Property Size (sq ft)
                    </label>
                    <input
                      type="number"
                      id="squareFootage"
                      name="squareFootage"
                      value={formData.squareFootage}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      placeholder="e.g., 2500"
                      min="0"
                    />
                  </div>

                  <div>
                    <label htmlFor="lotSize" className="block text-sm font-medium text-gray-300 mb-1">
                      Lot Size (acres)
                    </label>
                    <input
                      type="number"
                      id="lotSize"
                      name="lotSize"
                      value={formData.lotSize}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      placeholder="e.g., 0.5"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="gateCode" className="block text-sm font-medium text-gray-300 mb-1">
                    Gate Code
                  </label>
                  <input
                    type="text"
                    id="gateCode"
                    name="gateCode"
                    value={formData.gateCode}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    placeholder="Enter gate code if applicable"
                  />
                </div>

                <div>
                  <label htmlFor="accessInstructions" className="block text-sm font-medium text-gray-300 mb-1">
                    Access Notes
                  </label>
                  <textarea
                    id="accessInstructions"
                    name="accessInstructions"
                    value={formData.accessInstructions}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 resize-none"
                    placeholder="Special instructions for crew access..."
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-700 pt-6">
              <div className="space-y-4">
                <div>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="isPrimary"
                      checked={formData.isPrimary}
                      onChange={handleChange}
                      className="mr-2 text-cyan-500 focus:ring-cyan-500 rounded"
                    />
                    <span className="text-gray-200">Set as primary property</span>
                  </label>
                </div>

                <div>
                  <label htmlFor="parkingInstructions" className="block text-sm font-medium text-gray-300 mb-1">
                    Additional Notes
                  </label>
                  <textarea
                    id="parkingInstructions"
                    name="parkingInstructions"
                    value={formData.parkingInstructions}
                    onChange={handleChange}
                    rows={4}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 resize-none"
                    placeholder="Add any additional notes about this property..."
                  />
                </div>
              </div>
            </div>
          </div>
        </form>

        <div className="flex justify-end gap-3 px-4 sm:px-6 py-4 border-t border-gray-700 bg-[#0a1421]">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2.5 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isLoading || !isFormValid()}
            className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              'Save Property'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PropertyEditor;
