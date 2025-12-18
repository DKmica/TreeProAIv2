import React, { useState, useEffect } from 'react';
import { Contact, ContactChannel } from '../types';
import XIcon from './icons/XIcon';

interface ContactEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (contact: Contact) => void;
  clientId: string;
  propertyId?: string;
  contact?: Contact;
}

interface ChannelFormData {
  channelType: 'email' | 'phone' | 'mobile' | 'fax';
  channelValue: string;
  label?: string;
  isPrimary: boolean;
}

interface FormData {
  contactType: 'general' | 'billing' | 'site_manager' | 'tenant' | 'owner';
  title: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  preferredContactMethod: 'email' | 'phone' | 'sms';
  canApproveQuotes: boolean;
  canReceiveInvoices: boolean;
  isPrimary: boolean;
  notes: string;
  channels: ChannelFormData[];
}

interface FormErrors {
  contactType?: string;
  firstName?: string;
  lastName?: string;
  channels?: string;
  [key: string]: string | undefined;
}

const ContactEditor: React.FC<ContactEditorProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  clientId, 
  propertyId, 
  contact 
}) => {
  const [formData, setFormData] = useState<FormData>({
    contactType: 'general',
    title: '',
    firstName: '',
    lastName: '',
    jobTitle: '',
    preferredContactMethod: 'email',
    canApproveQuotes: false,
    canReceiveInvoices: false,
    isPrimary: false,
    notes: '',
    channels: [{ channelType: 'email', channelValue: '', isPrimary: true }],
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (contact) {
      setFormData({
        contactType: contact.contactType,
        title: contact.title || '',
        firstName: contact.firstName,
        lastName: contact.lastName,
        jobTitle: contact.jobTitle || '',
        preferredContactMethod: contact.preferredContactMethod,
        canApproveQuotes: contact.canApproveQuotes,
        canReceiveInvoices: contact.canReceiveInvoices,
        isPrimary: contact.isPrimary,
        notes: contact.notes || '',
        channels: contact.channels && contact.channels.length > 0
          ? contact.channels.map(ch => ({
              channelType: ch.channelType,
              channelValue: ch.channelValue,
              label: ch.label,
              isPrimary: ch.isPrimary,
            }))
          : [{ channelType: 'email', channelValue: '', isPrimary: true }],
      });
    } else {
      setFormData({
        contactType: 'general',
        title: '',
        firstName: '',
        lastName: '',
        jobTitle: '',
        preferredContactMethod: 'email',
        canApproveQuotes: false,
        canReceiveInvoices: false,
        isPrimary: false,
        notes: '',
        channels: [{ channelType: 'email', channelValue: '', isPrimary: true }],
      });
    }
    setErrors({});
    setApiError(null);
  }, [contact, isOpen]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    const phoneRegex = /^[\d\s\-\(\)\+\.]+$/;
    return phone.length >= 10 && phoneRegex.test(phone);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.contactType) {
      newErrors.contactType = 'Contact type is required';
    }

    if (formData.channels.length === 0) {
      newErrors.channels = 'At least one contact channel is required';
    } else {
      const validChannels = formData.channels.filter(ch => ch.channelValue.trim());
      if (validChannels.length === 0) {
        newErrors.channels = 'At least one contact channel with a value is required';
      } else {
        formData.channels.forEach((channel, index) => {
          if (channel.channelValue.trim()) {
            if (channel.channelType === 'email' && !validateEmail(channel.channelValue)) {
              newErrors[`channel_${index}`] = 'Invalid email format';
            } else if (['phone', 'mobile', 'fax'].includes(channel.channelType) && !validatePhone(channel.channelValue)) {
              newErrors[`channel_${index}`] = 'Invalid phone format (minimum 10 digits)';
            }
          }
        });
      }
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

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleChannelChange = (index: number, field: keyof ChannelFormData, value: any) => {
    const newChannels = [...formData.channels];
    newChannels[index] = { ...newChannels[index], [field]: value };
    setFormData(prev => ({ ...prev, channels: newChannels }));

    if (errors[`channel_${index}`]) {
      setErrors(prev => ({ ...prev, [`channel_${index}`]: undefined }));
    }
    if (errors.channels) {
      setErrors(prev => ({ ...prev, channels: undefined }));
    }
  };

  const handleAddChannel = () => {
    setFormData(prev => ({
      ...prev,
      channels: [...prev.channels, { channelType: 'email', channelValue: '', isPrimary: false }],
    }));
  };

  const handleRemoveChannel = (index: number) => {
    if (formData.channels.length <= 1) {
      return;
    }
    const newChannels = formData.channels.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, channels: newChannels }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setApiError(null);

    try {
      const validChannels = formData.channels
        .filter(ch => ch.channelValue.trim())
        .map(ch => ({
          channelType: ch.channelType,
          channelValue: ch.channelValue.trim(),
          label: ch.label || undefined,
          isPrimary: ch.isPrimary,
          isVerified: false,
        }));

      const contactData: any = {
        clientId,
        propertyId: propertyId || undefined,
        contactType: formData.contactType,
        title: formData.title || undefined,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        jobTitle: formData.jobTitle || undefined,
        preferredContactMethod: formData.preferredContactMethod,
        canApproveQuotes: formData.canApproveQuotes,
        canReceiveInvoices: formData.canReceiveInvoices,
        isPrimary: formData.isPrimary,
        notes: formData.notes || undefined,
        channels: validChannels,
      };

      let response;
      if (contact) {
        delete contactData.clientId;
        delete contactData.propertyId;
        
        response = await fetch(`/api/contacts/${contact.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(contactData),
        });
      } else {
        response = await fetch(`/api/clients/${clientId}/contacts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(contactData),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save contact');
      }

      const result = await response.json();
      onSave(result.data);
      onClose();
    } catch (err: any) {
      console.error('Error saving contact:', err);
      setApiError(err.message || 'Failed to save contact');
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
    if (!formData.firstName.trim() || !formData.lastName.trim()) return false;
    const validChannels = formData.channels.filter(ch => ch.channelValue.trim());
    if (validChannels.length === 0) return false;
    
    for (const channel of validChannels) {
      if (channel.channelType === 'email' && !validateEmail(channel.channelValue)) return false;
      if (['phone', 'mobile', 'fax'].includes(channel.channelType) && !validatePhone(channel.channelValue)) return false;
    }
    
    return true;
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleOverlayClick}
    >
      <div className="bg-gray-900 rounded-lg shadow-xl w-[95vw] sm:w-full sm:max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-700">
          <h2 className="text-lg sm:text-xl font-bold text-white">
            {contact ? 'Edit Contact' : 'Add Contact'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <XIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="px-4 sm:px-6 py-4 space-y-6">
            {apiError && (
              <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded">
                {apiError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Contact Type <span className="text-red-400">*</span>
                </label>
                <select
                  name="contactType"
                  value={formData.contactType}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="general">General Contact</option>
                  <option value="billing">Billing Contact</option>
                  <option value="site_manager">Site Manager</option>
                  <option value="tenant">Tenant</option>
                  <option value="owner">Owner</option>
                </select>
                {errors.contactType && (
                  <p className="mt-1 text-sm text-red-400">{errors.contactType}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Mr., Mrs., Dr., etc."
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  First Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                {errors.firstName && (
                  <p className="mt-1 text-sm text-red-400">{errors.firstName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Last Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                {errors.lastName && (
                  <p className="mt-1 text-sm text-red-400">{errors.lastName}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Job Title
              </label>
              <input
                type="text"
                name="jobTitle"
                value={formData.jobTitle}
                onChange={handleChange}
                placeholder="e.g., Property Manager, Facilities Director"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-300">
                  Contact Channels <span className="text-red-400">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleAddChannel}
                  className="text-cyan-400 hover:text-cyan-300 text-sm font-medium"
                >
                  + Add Channel
                </button>
              </div>
              {errors.channels && (
                <p className="mb-2 text-sm text-red-400">{errors.channels}</p>
              )}
              <div className="space-y-3">
                {formData.channels.map((channel, index) => (
                  <div key={index} className="flex gap-2">
                    <select
                      value={channel.channelType}
                      onChange={(e) => handleChannelChange(index, 'channelType', e.target.value)}
                      className="w-32 px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                      <option value="email">Email</option>
                      <option value="phone">Phone</option>
                      <option value="mobile">Mobile</option>
                      <option value="fax">Fax</option>
                    </select>
                    <div className="flex-1">
                      <input
                        type="text"
                        value={channel.channelValue}
                        onChange={(e) => handleChannelChange(index, 'channelValue', e.target.value)}
                        placeholder={channel.channelType === 'email' ? 'email@example.com' : '(555) 123-4567'}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                      {errors[`channel_${index}`] && (
                        <p className="mt-1 text-sm text-red-400">{errors[`channel_${index}`]}</p>
                      )}
                    </div>
                    <input
                      type="text"
                      value={channel.label || ''}
                      onChange={(e) => handleChannelChange(index, 'label', e.target.value)}
                      placeholder="Label (optional)"
                      className="w-32 px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                    <label className="flex items-center px-3 py-2 bg-gray-800 border border-gray-600 rounded-md">
                      <input
                        type="checkbox"
                        checked={channel.isPrimary}
                        onChange={(e) => handleChannelChange(index, 'isPrimary', e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-300">Primary</span>
                    </label>
                    {formData.channels.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveChannel(index)}
                        className="px-3 py-2 bg-red-900/50 text-red-400 hover:bg-red-900 rounded-md transition-colors"
                      >
                        <XIcon className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Preferred Contact Method
              </label>
              <select
                name="preferredContactMethod"
                value={formData.preferredContactMethod}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="email">Email</option>
                <option value="phone">Phone</option>
                <option value="sms">SMS</option>
              </select>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-300">
                Permissions
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="canApproveQuotes"
                    checked={formData.canApproveQuotes}
                    onChange={handleChange}
                    className="mr-2"
                  />
                  <span className="text-gray-300">Can Approve Quotes</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="canReceiveInvoices"
                    checked={formData.canReceiveInvoices}
                    onChange={handleChange}
                    className="mr-2"
                  />
                  <span className="text-gray-300">Can Receive Invoices</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="isPrimary"
                    checked={formData.isPrimary}
                    onChange={handleChange}
                    className="mr-2"
                  />
                  <span className="text-gray-300">Primary Contact</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={4}
                placeholder="Additional notes about this contact..."
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>

          <div className="flex gap-3 px-4 sm:px-6 py-4 border-t border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !isFormValid()}
              className={`flex-1 px-4 py-2 rounded-md transition-colors ${
                isLoading || !isFormValid()
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-cyan-600 text-white hover:bg-cyan-700'
              }`}
            >
              {isLoading ? 'Saving...' : contact ? 'Update Contact' : 'Create Contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContactEditor;
