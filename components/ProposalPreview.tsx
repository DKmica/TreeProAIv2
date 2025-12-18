import React from 'react';
import { QuoteProposalData } from '../types';

interface ProposalPreviewProps {
  proposal: QuoteProposalData;
}

const ProposalPreview: React.FC<ProposalPreviewProps> = ({ proposal }) => {
  const { template, client, property, quote, sections, pricingOptions, generated_at } = proposal;

  return (
    <div className="bg-white border border-brand-gray-200 rounded-lg shadow-sm overflow-hidden">
      {template?.cover_page_enabled && (
        <div className="relative">
          {template.cover_page_image_url ? (
            <img
              src={template.cover_page_image_url}
              alt="Proposal cover"
              className="w-full h-48 object-cover"
            />
          ) : (
            <div className="w-full h-48 bg-gradient-to-r from-brand-cyan-50 via-white to-brand-cyan-50" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <div className="absolute inset-0 flex flex-col justify-end p-6 text-white">
            <p className="text-sm uppercase tracking-wide font-semibold text-white/80">Proposal</p>
            <h2 className="text-2xl font-bold">{template.cover_page_title || template.name || 'Tree Service Proposal'}</h2>
            <p className="text-sm text-white/80">{template.cover_page_subtitle || 'Prepared for your property'}</p>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-white/70">
              {client?.name && <span>Client: {client.name}</span>}
              {property?.full_address && <span>Property: {property.full_address}</span>}
              {quote?.valid_until && <span>Valid until {new Date(quote.valid_until).toLocaleDateString()}</span>}
            </div>
          </div>
        </div>
      )}

      <div className="p-6 space-y-6">
        {template?.header_html && (
          <div
            className="prose max-w-none text-brand-gray-800"
            dangerouslySetInnerHTML={{ __html: template.header_html }}
          />
        )}

        {quote?.cover_letter && (
          <div className="bg-brand-gray-50 border border-brand-gray-200 rounded-md p-4">
            <p className="text-sm font-semibold text-brand-gray-900">Cover Letter</p>
            <p className="text-sm text-brand-gray-700 whitespace-pre-wrap">{quote.cover_letter}</p>
          </div>
        )}

        {sections && sections.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sections
              .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
              .map((section) => (
                <div key={section.id} className="border border-brand-gray-200 rounded-md p-4 bg-brand-gray-50">
                  <p className="text-xs uppercase tracking-wide text-brand-gray-500 font-semibold">{section.section_type}</p>
                  <h3 className="text-lg font-semibold text-brand-gray-900 mt-1">{section.title || section.name}</h3>
                  {section.content && (
                    <div className="prose prose-sm max-w-none text-brand-gray-700 mt-2" dangerouslySetInnerHTML={{ __html: section.content }} />
                  )}
                </div>
              ))}
          </div>
        )}

        {pricingOptions && pricingOptions.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {pricingOptions.slice(0, 3).map((option) => (
              <div key={option.id} className="border border-brand-gray-200 rounded-md p-4 bg-white shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-brand-gray-900">{option.optionName}</p>
                  <span className="text-xs px-2 py-1 rounded-full bg-brand-cyan-50 text-brand-cyan-700 border border-brand-cyan-100">
                    {option.optionTier}
                  </span>
                </div>
                <p className="mt-1 text-xs text-brand-gray-600">{option.description}</p>
                <p className="mt-3 text-2xl font-bold text-brand-gray-900">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(option.total)}
                </p>
                {option.features && option.features.length > 0 && (
                  <ul className="mt-3 space-y-1 text-xs text-brand-gray-700">
                    {option.features.slice(0, 3).map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand-cyan-500" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {option.isRecommended && (
                  <span className="mt-3 inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold bg-amber-100 text-amber-800">
                    Recommended
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {template?.custom_disclaimers && template.custom_disclaimers.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
            <p className="text-sm font-semibold text-amber-900 mb-2">Disclaimers</p>
            <ul className="space-y-2 text-xs text-amber-800">
              {template.custom_disclaimers.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-500" />
                  <div>
                    <p className="font-semibold">{item.label}</p>
                    <p>{item.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {quote?.custom_terms && (
          <div className="bg-brand-gray-50 border border-brand-gray-200 rounded-md p-4">
            <p className="text-sm font-semibold text-brand-gray-900 mb-2">Terms & Conditions</p>
            <p className="text-sm text-brand-gray-700 whitespace-pre-wrap">{quote.custom_terms}</p>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-brand-gray-500">
          <span>Generated {generated_at ? new Date(generated_at).toLocaleString() : 'just now'}</span>
          {template?.footer_html && (
            <div className="prose prose-xs max-w-none" dangerouslySetInnerHTML={{ __html: template.footer_html }} />
          )}
        </div>
      </div>
    </div>
  );
};

export default ProposalPreview;
