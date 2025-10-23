import React, { useState, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Quote, LineItem, PortalMessage } from '../../types';
import SignaturePad from '../../components/SignaturePad';
import CheckBadgeIcon from '../../components/icons/CheckBadgeIcon';
import SpinnerIcon from '../../components/icons/SpinnerIcon';
import PortalMessaging from '../../components/PortalMessaging';

interface QuotePortalProps {
  quotes: Quote[];
  setQuotes: React.Dispatch<React.SetStateAction<Quote[]>>;
}

const QuotePortal: React.FC<QuotePortalProps> = ({ quotes, setQuotes }) => {
  const { quoteId } = useParams<{ quoteId: string }>();

  const quote = useMemo(() => quotes.find(q => q.id === quoteId), [quotes, quoteId]);
  
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [isSigning, setIsSigning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (quote) {
      setLineItems(quote.lineItems.map(item => ({ ...item })));
    }
  }, [quote]);

  const handleLineItemToggle = (index: number) => {
      if (quote?.status !== 'Sent') return; // Prevent changes if not in 'Sent' state
      const updatedItems = [...lineItems];
      updatedItems[index].selected = !updatedItems[index].selected;
      setLineItems(updatedItems);
  };

  const handleAcceptAndSign = () => {
    setIsSigning(true);
  };

  const handleSendMessage = (text: string) => {
    if (!quoteId) return;
    const newMessage: PortalMessage = {
        sender: 'customer',
        text,
        timestamp: new Date().toISOString(),
    };
    setQuotes(prev => prev.map(q => 
        q.id === quoteId 
            ? { ...q, messages: [...(q.messages || []), newMessage] } 
            : q
    ));
  };


  const handleSignatureSave = (signatureDataUrl: string) => {
    if (!quote) return;
    setIsSaving(true);
    // Simulate network delay
    setTimeout(() => {
      setQuotes(prevQuotes =>
        prevQuotes.map(q =>
          q.id === quote.id
            ? {
                ...q,
                lineItems, // Save the customer's final selection
                status: 'Accepted',
                signature: signatureDataUrl,
                acceptedAt: new Date().toISOString(),
              }
            : q
        )
      );
      setIsSaving(false);
      setIsSigning(false);
    }, 1500);
  };

  const totalAmount = useMemo(() => {
    const itemsTotal = lineItems.reduce((sum, item) => (item.selected ? sum + item.price : sum), 0);
    return itemsTotal + (quote?.stumpGrindingPrice || 0);
  }, [lineItems, quote]);

  if (!quote) {
    return (
      <div className="text-center p-8 bg-white rounded-lg shadow">
        <h2 className="text-xl font-bold text-red-600">Quote Not Found</h2>
        <p className="mt-2 text-brand-gray-600">The requested quote is invalid or no longer available.</p>
      </div>
    );
  }
  
  if (quote.status === 'Accepted') {
    return (
        <div className="text-center p-8 sm:p-12 bg-white rounded-lg shadow-lg">
            <CheckBadgeIcon className="mx-auto h-16 w-16 text-brand-green-500" />
            <h2 className="mt-4 text-2xl font-bold text-brand-gray-900">Thank You, {quote.customerName}!</h2>
            <p className="mt-2 text-brand-gray-600">This quote was accepted on {new Date(quote.acceptedAt!).toLocaleDateString()}.</p>
            <p className="mt-1 text-brand-gray-600">We will be in touch shortly to schedule your job. We appreciate your business!</p>
            <img src={quote.signature} alt="Customer Signature" className="mt-6 mx-auto max-w-xs border rounded-md p-2 bg-brand-gray-50"/>
        </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-6 bg-brand-gray-50 border-b">
          <div className="sm:flex sm:justify-between sm:items-start">
              <div>
                <h1 className="text-2xl font-bold text-brand-gray-900">Quote for {quote.customerName}</h1>
                <p className="text-sm text-brand-gray-600 mt-1">Quote ID: {quote.id} | Issued: {new Date(quote.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="mt-4 sm:mt-0 text-left sm:text-right">
                <p className="text-sm font-semibold text-brand-gray-700">Status</p>
                <p className={`mt-1 text-sm font-bold ${quote.status === 'Sent' ? 'text-blue-600' : 'text-brand-gray-800'}`}>{quote.status}</p>
              </div>
          </div>
        </div>
        
        <div className="p-6">
          <h2 className="text-lg font-semibold text-brand-gray-800">Services</h2>
          <div className="mt-4 flow-root">
            <div className="-mx-6">
              <table className="min-w-full">
                <tbody className="divide-y divide-brand-gray-200">
                  {lineItems.map((item, index) => (
                    <tr key={index}>
                      <td className="w-10 px-6 py-4">
                        <input type="checkbox" checked={item.selected} onChange={() => handleLineItemToggle(index)} disabled={quote.status !== 'Sent'} className="h-5 w-5 rounded border-gray-300 text-brand-green-600 focus:ring-brand-green-500 disabled:opacity-50" />
                      </td>
                      <td className="px-6 py-4 text-sm text-brand-gray-800">
                        <p className="font-medium">{item.description}</p>
                        {!item.selected && <span className="text-xs text-red-600">(Not included)</span>}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-semibold text-brand-gray-900">${item.price.toFixed(2)}</td>
                    </tr>
                  ))}
                  {(quote.stumpGrindingPrice > 0) && (
                     <tr>
                      <td className="w-10 px-6 py-4"></td>
                      <td className="px-6 py-4 text-sm font-medium text-brand-gray-800">Stump Grinding</td>
                      <td className="px-6 py-4 text-right text-sm font-semibold text-brand-gray-900">${quote.stumpGrindingPrice.toFixed(2)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="p-6 bg-brand-gray-50 border-t">
          <div className="text-right space-y-2">
            <p className="text-md font-semibold text-brand-gray-800">Total Amount:</p>
            <p className="text-4xl font-bold text-brand-gray-900">${totalAmount.toFixed(2)}</p>
          </div>
        </div>

        {quote.status === 'Sent' && (
             <div className="p-6 border-t text-center">
                <button onClick={handleAcceptAndSign} className="w-full sm:w-auto inline-flex items-center justify-center rounded-md border border-transparent bg-brand-green-600 px-8 py-3 text-base font-medium text-white shadow-sm hover:bg-brand-green-700 focus:outline-none focus:ring-2 focus:ring-brand-green-500 focus:ring-offset-2">
                    Accept & Sign Quote
                </button>
                <p className="mt-4 text-xs text-brand-gray-500">By clicking 'Accept & Sign', you agree to the services and pricing outlined in this quote.</p>
             </div>
        )}
      </div>

      <div className="mt-6 bg-white rounded-lg shadow-lg overflow-hidden h-96">
        <PortalMessaging 
            messages={quote.messages || []}
            onSendMessage={handleSendMessage}
            senderType="customer"
        />
      </div>

      {isSigning && (
         <div className="fixed inset-0 bg-brand-gray-800 bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg relative">
              <div className="p-6 border-b">
                <h3 className="text-lg font-semibold text-brand-gray-900">Please provide your signature</h3>
              </div>
              <div className="p-6">
                <SignaturePad onSave={handleSignatureSave} />
              </div>
              <div className="p-6 border-t bg-brand-gray-50 flex justify-end">
                <button onClick={() => setIsSigning(false)} disabled={isSaving} className="text-sm font-semibold text-brand-gray-700 py-2 px-4 rounded-md hover:bg-brand-gray-100">Cancel</button>
              </div>
               {isSaving && (
                <div className="absolute inset-0 bg-white bg-opacity-80 flex flex-col items-center justify-center">
                    <SpinnerIcon className="w-10 h-10 text-brand-green-600"/>
                    <p className="mt-3 text-brand-gray-700 font-semibold">Accepting Quote...</p>
                </div>
              )}
            </div>
         </div>
      )}

    </>
  );
};

export default QuotePortal;