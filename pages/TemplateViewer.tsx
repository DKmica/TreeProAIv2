import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { mockDocumentTemplates } from '../data/mockData';
import ArrowLeftIcon from '../components/icons/ArrowLeftIcon';

const TemplateViewer: React.FC = () => {
  const { templateId } = useParams<{ templateId: string }>();
  const template = mockDocumentTemplates.find(t => t.id === templateId);

  if (!template) {
    return (
        <div className="text-center p-8 bg-white rounded-lg shadow">
             <h2 className="text-xl font-bold text-red-600">Template Not Found</h2>
             <Link to="/settings" className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-brand-cyan-600 hover:bg-brand-green-700">
                <ArrowLeftIcon className="w-5 h-5 mr-2" />
                Back to Settings
            </Link>
        </div>
    );
  }

  return (
    <div>
      <Link to="/settings" className="inline-flex items-center text-sm font-semibold text-brand-green-600 hover:text-brand-green-800 mb-4">
        <ArrowLeftIcon className="w-5 h-5 mr-2" />
        Back to Settings
      </Link>
      <div className="bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold text-brand-gray-900">{template.name}</h1>
        <p className="text-brand-gray-600">{template.description}</p>
        <div className="mt-6 border-t pt-6">
            <h2 className="text-lg font-semibold">Template Editor (Placeholder)</h2>
            <p className="mt-2 text-sm text-brand-gray-500">A full-featured template editor would appear here, allowing you to customize the layout, add variables like <code>{`{{customer.name}}`}</code>, and style the document.</p>
            <div className="mt-4 p-4 bg-brand-gray-100 rounded-md border text-sm text-brand-gray-700">
                <pre><code>{template.content}</code></pre>
            </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateViewer;
