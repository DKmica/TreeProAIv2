import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import QuickBooksIcon from '../components/icons/QuickBooksIcon';
import StripeIcon from '../components/icons/StripeIcon';
import GoogleCalendarIcon from '../components/icons/GoogleCalendarIcon';
import { CustomFieldDefinition, DocumentTemplate } from '../types';
import { mockCustomFields, mockDocumentTemplates } from '../data/mockData';
import PuzzlePieceIcon from '../components/icons/PuzzlePieceIcon';
import DocumentTextIcon from '../components/icons/DocumentTextIcon';

const Settings: React.FC = () => {
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>(mockCustomFields);
  const [documentTemplates, setDocumentTemplates] = useState<DocumentTemplate[]>(mockDocumentTemplates);

  // State for the custom field form
  const [selectedEntity, setSelectedEntity] = useState<CustomFieldDefinition['entity']>('customer');
  const [isAddingField, setIsAddingField] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<CustomFieldDefinition['type']>('text');

  // State for template editing
  const [editingTemplate, setEditingTemplate] = useState<DocumentTemplate | null>(null);
  const [templateContent, setTemplateContent] = useState('');

  const filteredFields = useMemo(() => {
    return customFields.filter(field => field.entity === selectedEntity);
  }, [customFields, selectedEntity]);
  
  const handleSaveField = () => {
    if (!newFieldName.trim()) {
      alert('Field name cannot be empty.');
      return;
    }
    const newField: CustomFieldDefinition = {
      id: `cf_${selectedEntity}_${Date.now()}`,
      name: newFieldName.trim(),
      type: newFieldType,
      entity: selectedEntity,
    };
    setCustomFields(prev => [...prev, newField]);
    setNewFieldName('');
    setNewFieldType('text');
    setIsAddingField(false);
  };

  const handleDeleteField = (fieldId: string) => {
    if (window.confirm('Are you sure you want to delete this custom field?')) {
      setCustomFields(prev => prev.filter(field => field.id !== fieldId));
    }
  };

  const handleEditTemplate = (template: DocumentTemplate) => {
    setEditingTemplate(template);
    setTemplateContent(template.content || '');
  };

  const handleSaveTemplate = () => {
    if (editingTemplate) {
      setDocumentTemplates(prev => 
        prev.map(t => t.id === editingTemplate.id 
          ? { ...t, content: templateContent } 
          : t
        )
      );
      setEditingTemplate(null);
      setTemplateContent('');
    }
  };

  const handleCancelEditTemplate = () => {
    setEditingTemplate(null);
    setTemplateContent('');
  };


  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-gray-900">Settings</h1>
      <p className="mt-2 text-sm text-brand-gray-700">Manage your profile, company information, and application settings.</p>

      <div className="mt-8 space-y-12">
        {/* My Profile Section */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-3">
          <div>
            <h2 className="text-base font-semibold leading-7 text-brand-gray-900">My Profile</h2>
            <p className="mt-1 text-sm leading-6 text-brand-gray-600">Update your personal information and password.</p>
          </div>

          <form className="md:col-span-2">
            <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <label htmlFor="first-name" className="block text-sm font-medium leading-6 text-brand-gray-900">First name</label>
                <div className="mt-2">
                  <input type="text" name="first-name" id="first-name" autoComplete="given-name" defaultValue="Admin" className="block w-full rounded-md border-0 py-1.5 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 placeholder:text-brand-gray-400 focus:ring-2 focus:ring-inset focus:ring-brand-cyan-500 sm:text-sm sm:leading-6" />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="last-name" className="block text-sm font-medium leading-6 text-brand-gray-900">Last name</label>
                <div className="mt-2">
                  <input type="text" name="last-name" id="last-name" autoComplete="family-name" defaultValue="User" className="block w-full rounded-md border-0 py-1.5 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 placeholder:text-brand-gray-400 focus:ring-2 focus:ring-inset focus:ring-brand-cyan-500 sm:text-sm sm:leading-6" />
                </div>
              </div>

              <div className="sm:col-span-4">
                <label htmlFor="email" className="block text-sm font-medium leading-6 text-brand-gray-900">Email address</label>
                <div className="mt-2">
                  <input id="email" name="email" type="email" autoComplete="email" defaultValue="admin@tree-pro.ai" className="block w-full rounded-md border-0 py-1.5 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 placeholder:text-brand-gray-400 focus:ring-2 focus:ring-inset focus:ring-brand-cyan-500 sm:text-sm sm:leading-6" />
                </div>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-x-6">
                <button type="button" className="text-sm font-semibold leading-6 text-brand-gray-900">Change Password</button>
                <button type="submit" className="rounded-md bg-brand-cyan-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-cyan-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-cyan-500">Save Profile</button>
            </div>
          </form>
        </div>

        <div className="border-t border-brand-gray-200"></div>

        {/* Company Information Section */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-3">
          <div>
            <h2 className="text-base font-semibold leading-7 text-brand-gray-900">Company Information</h2>
            <p className="mt-1 text-sm leading-6 text-brand-gray-600">This information will be displayed on quotes and invoices.</p>
          </div>

          <form className="md:col-span-2">
            <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
                <div className="sm:col-span-4">
                    <label htmlFor="company-name" className="block text-sm font-medium leading-6 text-brand-gray-900">Company Name</label>
                    <input type="text" name="company-name" id="company-name" defaultValue="TreePro AI Services" className="mt-2 block w-full rounded-md border-0 py-1.5 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 focus:ring-2 focus:ring-inset focus:ring-brand-cyan-500 sm:text-sm sm:leading-6" />
                </div>
                <div className="col-span-full">
                    <label htmlFor="company-address" className="block text-sm font-medium leading-6 text-brand-gray-900">Address</label>
                    <input type="text" name="company-address" id="company-address" defaultValue="123 Arborist Ave, Suite 100, Greendale, USA" className="mt-2 block w-full rounded-md border-0 py-1.5 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 focus:ring-2 focus:ring-inset focus:ring-brand-cyan-500 sm:text-sm sm:leading-6" />
                </div>
                 <div className="col-span-full">
                    <label htmlFor="photo" className="block text-sm font-medium leading-6 text-brand-gray-900">Company Logo</label>
                    <div className="mt-2 flex items-center gap-x-3">
                      <svg className="h-12 w-12 text-brand-gray-300" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M18.685 19.097A9.723 9.723 0 0021.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 003.065 7.097A9.716 9.716 0 0012 21.75a9.716 9.716 0 006.685-2.653zm-12.54-1.285A7.486 7.486 0 0112 15a7.486 7.486 0 015.855 2.812A8.224 8.224 0 0112 20.25a8.224 8.224 0 01-5.855-2.438zM15.75 9a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" clipRule="evenodd" />
                      </svg>
                      <button type="button" className="rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 hover:bg-brand-gray-50">Change</button>
                    </div>
                </div>
            </div>
             <div className="mt-6 flex items-center justify-end gap-x-6">
                <button type="submit" className="rounded-md bg-brand-cyan-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-cyan-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-cyan-500">Save Company Info</button>
            </div>
          </form>
        </div>

        <div className="border-t border-brand-gray-200"></div>

        {/* Customization & Templates Section */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-3">
          <div>
            <h2 className="text-base font-semibold leading-7 text-brand-gray-900">Customization & Templates</h2>
            <p className="mt-1 text-sm leading-6 text-brand-gray-600">Adapt the application to your workflow by adding custom fields and managing document templates.</p>
          </div>
          <div className="md:col-span-2 space-y-10">
            {/* Custom Fields */}
            <div>
              <h3 className="text-md font-semibold flex items-center text-brand-gray-800"><PuzzlePieceIcon className="w-5 h-5 mr-2" /> Custom Fields</h3>
              <div className="mt-4 p-4 border rounded-lg bg-white">
                <label htmlFor="entity-select" className="block text-sm font-medium text-brand-gray-700">Manage fields for:</label>
                <select id="entity-select" value={selectedEntity} onChange={e => setSelectedEntity(e.target.value as CustomFieldDefinition['entity'])} className="mt-1 block w-full max-w-xs rounded-md border-brand-gray-300 shadow-sm focus:border-brand-green-500 focus:ring-brand-green-500 sm:text-sm">
                  <option value="customer">Customers</option>
                  <option value="lead">Leads</option>
                  <option value="job">Jobs</option>
                  <option value="quote">Quotes</option>
                  <option value="invoice">Invoices</option>
                  <option value="employee">Employees</option>
                  <option value="equipment">Equipment</option>
                </select>
                <div className="mt-4 flow-root">
                  <ul className="divide-y divide-brand-gray-200">
                    {filteredFields.map(field => (
                      <li key={field.id} className="flex items-center justify-between py-2">
                        <div>
                          <p className="font-medium text-brand-gray-800">{field.name}</p>
                          <span className="text-xs uppercase font-semibold text-brand-gray-500 bg-brand-gray-100 px-2 py-0.5 rounded-full">{field.type}</span>
                        </div>
                        <button onClick={() => handleDeleteField(field.id)} className="text-red-600 hover:text-red-800 text-sm font-medium">Delete</button>
                      </li>
                    ))}
                  </ul>
                  {filteredFields.length === 0 && <p className="text-sm text-brand-gray-500 text-center py-4">No custom fields for {selectedEntity}.</p>}
                </div>
                {!isAddingField ? (
                  <button onClick={() => setIsAddingField(true)} className="mt-4 text-sm font-semibold text-brand-green-600 hover:text-brand-green-800">+ Add New Field</button>
                ) : (
                  <div className="mt-4 p-3 bg-brand-gray-50 rounded-md border space-y-3">
                    <h4 className="font-medium text-sm">New Field Details</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <input type="text" placeholder="Field Name (e.g., Gate Code)" value={newFieldName} onChange={e => setNewFieldName(e.target.value)} className="block w-full rounded-md border-0 py-1.5 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 focus:ring-2 focus:ring-inset focus:ring-brand-cyan-500 sm:text-sm" />
                      <select value={newFieldType} onChange={e => setNewFieldType(e.target.value as CustomFieldDefinition['type'])} className="block w-full rounded-md border-0 py-1.5 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 focus:ring-2 focus:ring-inset focus:ring-brand-cyan-500 sm:text-sm">
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                        <option value="date">Date</option>
                        <option value="checkbox">Checkbox</option>
                      </select>
                    </div>
                    <div className="flex justify-end gap-x-3">
                      <button onClick={() => setIsAddingField(false)} className="text-sm font-semibold">Cancel</button>
                      <button onClick={handleSaveField} className="rounded-md bg-brand-cyan-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-cyan-700">Save Field</button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Document Templates */}
            <div>
               <h3 className="text-md font-semibold flex items-center text-brand-gray-800"><DocumentTextIcon className="w-5 h-5 mr-2" /> Document Templates</h3>
               <p className="mt-1 text-sm text-brand-gray-600">Customize your quote, invoice, and report templates with dynamic variables.</p>
               
               {editingTemplate ? (
                 <div className="mt-4 p-6 border rounded-lg bg-white">
                   <div className="flex items-center justify-between mb-4">
                     <div>
                       <span className="text-xs uppercase font-semibold text-brand-gray-500 bg-brand-gray-100 px-2 py-0.5 rounded-full">{editingTemplate.type}</span>
                       <h4 className="mt-2 text-lg font-semibold text-brand-gray-800">{editingTemplate.name}</h4>
                     </div>
                     <button onClick={handleCancelEditTemplate} className="text-sm text-brand-gray-600 hover:text-brand-gray-900">✕ Close</button>
                   </div>
                   
                   <div className="mb-4">
                     <label className="block text-sm font-medium text-brand-gray-700 mb-2">Template Content</label>
                     <textarea 
                       value={templateContent} 
                       onChange={e => setTemplateContent(e.target.value)}
                       rows={12}
                       className="block w-full rounded-md border-0 py-1.5 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 placeholder:text-brand-gray-400 focus:ring-2 focus:ring-inset focus:ring-brand-cyan-500 sm:text-sm font-mono"
                       placeholder="Enter template content..."
                     />
                   </div>
                   
                   <div className="mb-4 p-3 bg-brand-gray-50 rounded-md border">
                     <p className="text-xs font-semibold text-brand-gray-700 mb-2">Available Variables:</p>
                     <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-brand-gray-600">
                       <code>{'{{customer_name}}'}</code>
                       <code>{'{{customer_email}}'}</code>
                       <code>{'{{customer_phone}}'}</code>
                       <code>{'{{customer_address}}'}</code>
                       <code>{'{{total_amount}}'}</code>
                       <code>{'{{date}}'}</code>
                       <code>{'{{quote_id}}'}</code>
                       <code>{'{{job_location}}'}</code>
                       <code>{'{{line_items}}'}</code>
                       <code>{'{{payment_terms}}'}</code>
                       <code>{'{{deposit_amount}}'}</code>
                       <code>{'{{company_name}}'}</code>
                     </div>
                   </div>
                   
                   <div className="flex justify-end gap-x-3">
                     <button onClick={handleCancelEditTemplate} className="text-sm font-semibold text-brand-gray-900">Cancel</button>
                     <button onClick={handleSaveTemplate} className="rounded-md bg-brand-cyan-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-cyan-700">Save Template</button>
                   </div>
                 </div>
               ) : (
                 <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                   {documentTemplates.map(template => (
                     <div key={template.id} className="p-4 border rounded-lg bg-white flex flex-col hover:border-brand-cyan-300 transition-colors">
                       <div className="flex-grow">
                          <span className="text-xs uppercase font-semibold text-brand-gray-500 bg-brand-gray-100 px-2 py-0.5 rounded-full">{template.type}</span>
                          <h4 className="mt-2 font-semibold text-brand-gray-800">{template.name}</h4>
                          <p className="mt-1 text-sm text-brand-gray-600">{template.description}</p>
                       </div>
                       <div className="mt-4">
                          <button onClick={() => handleEditTemplate(template)} className="text-sm font-semibold text-brand-cyan-600 hover:text-brand-cyan-800">Edit Template &rarr;</button>
                       </div>
                     </div>
                   ))}
                 </div>
               )}
            </div>
          </div>
        </div>

        <div className="border-t border-brand-gray-200"></div>

        {/* Integrations Section */}
         <div className="grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-3">
          <div>
            <h2 className="text-base font-semibold leading-7 text-brand-gray-900">Integrations</h2>
            <p className="mt-1 text-sm leading-6 text-brand-gray-600">Connect TreePro AI with other services.</p>
          </div>
          <div className="md:col-span-2 space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center">
                    <QuickBooksIcon className="w-8 h-8 mr-4" />
                    <div>
                        <h3 className="font-semibold text-brand-gray-800">QuickBooks</h3>
                        <p className="text-sm text-brand-gray-500">Sync invoices and payments automatically.</p>
                    </div>
                  </div>
                  <button className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 hover:bg-brand-gray-50">Connect</button>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center">
                    <StripeIcon className="w-8 h-8 mr-4" />
                     <div>
                        <h3 className="font-semibold text-brand-gray-800">Stripe</h3>
                        <p className="text-sm text-brand-gray-500">Process online payments for invoices.</p>
                    </div>
                  </div>
                  <button className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 hover:bg-brand-gray-50">Connect</button>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center">
                    <GoogleCalendarIcon className="w-8 h-8 mr-4" />
                     <div>
                        <h3 className="font-semibold text-brand-gray-800">Google Calendar</h3>
                        <p className="text-sm text-brand-gray-500">Sync job schedules with your calendar.</p>
                    </div>
                  </div>
                  <button className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 hover:bg-brand-gray-50">Connect</button>
              </div>
          </div>
        </div>

        <div className="border-t border-brand-gray-200"></div>

        {/* Angi Ads Integration Section */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-3">
          <div>
            <h2 className="text-base font-semibold leading-7 text-brand-gray-900">Angi Ads Integration</h2>
            <p className="mt-1 text-sm leading-6 text-brand-gray-600">Automatically receive leads from Angi Ads (formerly Angie's List).</p>
          </div>
          <div className="md:col-span-2 space-y-6">
            <div className="p-6 border rounded-lg bg-gradient-to-br from-brand-cyan-50 to-white">
              <h3 className="text-lg font-semibold text-brand-gray-900 mb-4">Webhook Configuration</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-brand-gray-700 mb-2">
                    Webhook URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`https://${window.location.hostname}/api/webhooks/angi`}
                      className="flex-1 block w-full rounded-md border-0 py-2 px-3 text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 bg-brand-gray-50 sm:text-sm font-mono"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`https://${window.location.hostname}/api/webhooks/angi`);
                        alert('Webhook URL copied to clipboard!');
                      }}
                      className="rounded-md bg-brand-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-cyan-700"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-md border border-brand-cyan-200">
                  <h4 className="text-sm font-semibold text-brand-gray-900 mb-2">Setup Instructions</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-brand-gray-700">
                    <li>Log in to your Angi Pro account at <a href="https://office.angi.com" target="_blank" rel="noopener noreferrer" className="text-brand-cyan-600 hover:text-brand-cyan-700 underline">office.angi.com</a></li>
                    <li>Navigate to <strong>Ads → Settings → Integrations → Webhooks</strong></li>
                    <li>Click <strong>"Add Webhook"</strong> and paste the webhook URL above</li>
                    <li>Set the event type to <strong>"New Lead"</strong></li>
                    <li>Add your API key in the <strong>X-API-KEY</strong> header (set this in your environment variables as ANGI_ADS_WEBHOOK_SECRET)</li>
                    <li>Save the webhook configuration</li>
                  </ol>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <div className="flex">
                    <svg className="h-5 w-5 text-yellow-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div className="text-sm text-yellow-800">
                      <p className="font-semibold mb-1">Important:</p>
                      <p>Make sure to set the <code className="bg-yellow-100 px-1 py-0.5 rounded">ANGI_ADS_WEBHOOK_SECRET</code> environment variable with a secure API key. This key must match the one you configure in the Angi Ads dashboard.</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={async () => {
                      try {
                        const testPayload = {
                          name: "Test Customer",
                          phone: "555-0123",
                          email: "test@example.com",
                          comments: "This is a test lead from the Angi Ads integration",
                          address: "123 Test St, Test City, TS 12345",
                          timestamp: new Date().toISOString(),
                          leadId: `TEST-${Date.now()}`
                        };
                        
                        const response = await fetch('/api/webhooks/angi', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'X-API-KEY': 'test-key'
                          },
                          body: JSON.stringify(testPayload)
                        });
                        
                        if (response.ok) {
                          const data = await response.json();
                          alert(`Test webhook successful! Lead ID: ${data.leadId}\nCustomer ID: ${data.customerId}`);
                        } else {
                          const error = await response.json();
                          alert(`Test webhook failed: ${error.message || error.error}`);
                        }
                      } catch (error) {
                        alert(`Test webhook error: ${error.message}`);
                      }
                    }}
                    className="rounded-md bg-brand-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-cyan-700"
                  >
                    Test Webhook
                  </button>
                  <a
                    href="https://office.angi.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-brand-gray-900 shadow-sm ring-1 ring-inset ring-brand-gray-300 hover:bg-brand-gray-50"
                  >
                    Open Angi Ads Dashboard →
                  </a>
                </div>
              </div>
            </div>

            <div className="text-sm text-brand-gray-600">
              <p><strong>How it works:</strong> When you receive a new lead on Angi Ads, it will automatically create a new customer (or link to an existing one) and add a lead with source "Angi Ads" in your TreePro AI system. You'll be able to see these leads in your Leads page and follow up accordingly.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Settings;
