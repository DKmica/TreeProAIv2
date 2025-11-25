import React, { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Client, CustomerUpload, Job } from '../../types';
import { useClientsQuery, useQuotesQuery, useJobsQuery, useInvoicesQuery } from '../../hooks/useDataQueries';
import { leadService } from '../../services/apiService';
import SpinnerIcon from '../../components/icons/SpinnerIcon';
import CheckCircleIcon from '../../components/icons/CheckCircleIcon';
import ClockIcon from '../../components/icons/ClockIcon';
import QuoteIcon from '../../components/icons/QuoteIcon';
import InvoiceIcon from '../../components/icons/InvoiceIcon';
import CreditCardIcon from '../../components/icons/CreditCardIcon';
import CalendarDaysIcon from '../../components/icons/CalendarDaysIcon';
import ChatBubbleLeftRightIcon from '../../components/icons/ChatBubbleLeftRightIcon';
import CameraIcon from '../../components/icons/CameraIcon';
import PlusCircleIcon from '../../components/icons/PlusCircleIcon';

interface UploadPreview extends CustomerUpload {
  localId: string;
}

const getClientDisplayName = (client?: Client) => {
  if (!client) return undefined;
  if (client.companyName) return client.companyName;
  const nameParts = [client.firstName, client.lastName].filter(Boolean).join(' ').trim();
  return nameParts || undefined;
};

const formatCurrency = (amount: number) =>
  amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const buildCustomerFilter = (clientId?: string, clientName?: string) => {
  return (recordClientId?: string, recordName?: string) =>
    (clientId && recordClientId === clientId) || (!!clientName && recordName === clientName);
};

const determineEtaCopy = (job: Job | undefined) => {
  if (!job) return 'No visits scheduled yet.';
  if (job.status === 'Completed') return 'Work completed – thank you for partnering with us!';
  if (job.status === 'Cancelled') return 'This visit was cancelled. Reach out if you need to reschedule.';
  if (job.status === 'In Progress') return 'Our crew is on-site completing your work now.';
  if (job.status === 'Scheduled' && job.scheduledDate) {
    const dateStr = new Date(job.scheduledDate).toLocaleString();
    if (job.arrivalEtaMinutes) {
      return `Our crew is en route. Estimated arrival in ${job.arrivalEtaMinutes} minutes (scheduled ${dateStr}).`;
    }
    return `You are scheduled for ${dateStr}. We will share a precise ETA when we start driving.`;
  }
  return 'We are preparing your schedule and will confirm your visit window soon.';
};

const ClientHub: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const { data: clients = [], isLoading: clientsLoading } = useClientsQuery();
  const { data: quotes = [], isLoading: quotesLoading } = useQuotesQuery();
  const { data: jobs = [], isLoading: jobsLoading } = useJobsQuery();
  const { data: invoices = [], isLoading: invoicesLoading } = useInvoicesQuery();

  const [requestDetails, setRequestDetails] = useState({
    service: '',
    description: '',
    preferredDate: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
  });
  const [uploads, setUploads] = useState<UploadPreview[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const client = useMemo(() => clients.find(c => c.id === clientId), [clients, clientId]);
  const customerDisplayName = getClientDisplayName(client);
  const matchesCustomer = useMemo(() => buildCustomerFilter(clientId, customerDisplayName), [clientId, customerDisplayName]);

  const clientQuotes = useMemo(() => quotes.filter(q => matchesCustomer(q.clientId, q.customerName)), [quotes, matchesCustomer]);
  const clientInvoices = useMemo(
    () => invoices.filter(inv => matchesCustomer(inv.clientId, inv.customerName)),
    [invoices, matchesCustomer]
  );
  const clientJobs = useMemo(() => jobs.filter(job => matchesCustomer(job.clientId, job.customerName)), [jobs, matchesCustomer]);

  const pendingQuotes = clientQuotes.filter(q => q.status === 'Sent' || q.status === 'Draft');
  const acceptedQuotes = clientQuotes.filter(q => q.status === 'Accepted');
  const unpaidInvoices = clientInvoices.filter(inv => inv.status !== 'Paid');

  const upcomingJob = useMemo(() => {
    const upcomingStatuses: Job['status'][] = ['Scheduled', 'In Progress'];
    return clientJobs
      .filter(job => upcomingStatuses.includes(job.status))
      .sort((a, b) => new Date(a.scheduledDate || 0).getTime() - new Date(b.scheduledDate || 0).getTime())[0];
  }, [clientJobs]);

  const isLoading = clientsLoading || quotesLoading || jobsLoading || invoicesLoading;

  const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    if (!event.target.files) return;
    const files = Array.from(event.target.files);
    const previews: UploadPreview[] = [];
    for (const file of files) {
      if (file.size > 25 * 1024 * 1024) {
        setSubmitError(`"${file.name}" is larger than 25MB. Please upload a smaller file.`);
        continue;
      }
      const url = await readFileAsDataUrl(file);
      previews.push({
        localId: `${file.name}-${Date.now()}`,
        url,
        name: file.name,
        uploadedAt: new Date().toISOString(),
        type: file.type,
      });
    }
    setUploads(prev => [...prev, ...previews]);
    event.target.value = '';
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitMessage(null);
    setSubmitError(null);

    try {
      await leadService.create({
        clientId: clientId || undefined,
        source: 'Customer Portal',
        status: 'New',
        description: `${requestDetails.service}\n\n${requestDetails.description}`.trim(),
        customerDetails: {
          firstName: requestDetails.contactName || customerDisplayName,
          phone: requestDetails.contactPhone || client?.primaryPhone,
          email: requestDetails.contactEmail || client?.primaryEmail,
          addressLine1: requestDetails.address || client?.billingAddressLine1 || undefined,
        },
        customerUploads: uploads.map(({ url, name, uploadedAt, type }) => ({ url, name, uploadedAt, type })),
        leadScore: 50,
        priority: 'medium',
        expectedCloseDate: requestDetails.preferredDate || undefined,
        updatedAt: new Date().toISOString(),
      });

      setSubmitMessage('Request received! We will review and follow up shortly.');
      setUploads([]);
      setRequestDetails({
        service: '',
        description: '',
        preferredDate: '',
        contactName: '',
        contactEmail: '',
        contactPhone: '',
        address: '',
      });
    } catch (error: any) {
      console.error('Failed to submit request', error);
      setSubmitError(error.message || 'Unable to submit request right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <SpinnerIcon className="h-12 w-12 text-brand-green-600" />
      </div>
    );
  }

  const customerLabel = customerDisplayName || 'Customer';
  const etaCopy = determineEtaCopy(upcomingJob);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow p-6 border border-brand-gray-100">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-brand-gray-500">Welcome back</p>
            <h1 className="text-2xl font-bold text-brand-gray-900">{customerLabel} Portal</h1>
            <p className="text-brand-gray-600 mt-2 max-w-2xl">
              Track quotes, pay invoices, follow your scheduled work, and request new services without needing to call in.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to={pendingQuotes[0] ? `/portal/quote/${pendingQuotes[0].id}` : '#quotes'}
              className="inline-flex items-center gap-2 rounded-md bg-brand-green-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-brand-green-700"
            >
              <QuoteIcon className="w-5 h-5" />
              Review quotes
            </Link>
            <Link
              to={unpaidInvoices[0] ? `/portal/invoice/${unpaidInvoices[0].id}` : '#invoices'}
              className="inline-flex items-center gap-2 rounded-md border border-brand-gray-200 px-4 py-2 text-sm font-semibold text-brand-gray-800 hover:border-brand-green-400"
            >
              <InvoiceIcon className="w-5 h-5" />
              Pay invoice
            </Link>
            <a href="#request" className="inline-flex items-center gap-2 rounded-md border border-transparent bg-brand-gray-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-brand-gray-800">
              <PlusCircleIcon className="w-5 h-5" />
              Request work
            </a>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-5 border border-brand-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-brand-gray-500">Quotes</p>
              <p className="text-2xl font-bold text-brand-gray-900">{pendingQuotes.length}</p>
              <p className="text-xs text-brand-gray-500">Awaiting your review</p>
            </div>
            <QuoteIcon className="w-8 h-8 text-brand-green-600" />
          </div>
          {acceptedQuotes.length > 0 && (
            <p className="mt-3 text-xs text-brand-green-700 bg-brand-green-50 rounded-md px-3 py-2 border border-brand-green-100">
              {acceptedQuotes.length} accepted – we are preparing the schedule.
            </p>
          )}
        </div>
        <div className="bg-white rounded-lg shadow p-5 border border-brand-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-brand-gray-500">Invoices</p>
              <p className="text-2xl font-bold text-brand-gray-900">{unpaidInvoices.length}</p>
              <p className="text-xs text-brand-gray-500">Outstanding balance</p>
            </div>
            <InvoiceIcon className="w-8 h-8 text-brand-gray-700" />
          </div>
          {unpaidInvoices[0] && (
            <p className="mt-3 text-xs text-red-700 bg-red-50 rounded-md px-3 py-2 border border-red-100">
              Due {new Date(unpaidInvoices[0].dueDate).toLocaleDateString()}: {formatCurrency(unpaidInvoices[0].amount)}
            </p>
          )}
        </div>
        <div className="bg-white rounded-lg shadow p-5 border border-brand-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-brand-gray-500">Next visit</p>
              <p className="text-2xl font-bold text-brand-gray-900">{upcomingJob ? 'Scheduled' : 'TBD'}</p>
              <p className="text-xs text-brand-gray-500">Status: {upcomingJob?.status || 'Planning'}</p>
            </div>
            <CalendarDaysIcon className="w-8 h-8 text-brand-cyan-500" />
          </div>
          <p className="mt-3 text-xs text-brand-gray-600 bg-brand-gray-50 rounded-md px-3 py-2 border border-brand-gray-200">
            {etaCopy}
          </p>
        </div>
      </div>

      <div id="quotes" className="bg-white rounded-xl shadow border border-brand-gray-100">
        <div className="px-6 py-4 border-b border-brand-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-brand-gray-900">Quotes</h2>
          <p className="text-xs text-brand-gray-500">Review, approve, or chat with us about any proposal.</p>
        </div>
        <div className="divide-y divide-brand-gray-50">
          {clientQuotes.map(quote => (
            <div key={quote.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="font-semibold text-brand-gray-900">Quote #{quote.quoteNumber || quote.id}</p>
                <p className="text-sm text-brand-gray-500">Issued {new Date(quote.createdAt).toLocaleDateString()}</p>
                <div className="mt-2 inline-flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full bg-brand-gray-100 text-brand-gray-800">
                  {quote.status}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-brand-gray-900">{formatCurrency(quote.grandTotal || quote.totalAmount || 0)}</span>
                <Link
                  to={`/portal/quote/${quote.id}`}
                  className="inline-flex items-center gap-2 rounded-md border border-brand-gray-200 px-4 py-2 text-sm font-semibold text-brand-gray-800 hover:border-brand-green-400"
                >
                  <ChatBubbleLeftRightIcon className="w-5 h-5" />
                  Open
                </Link>
              </div>
            </div>
          ))}
          {clientQuotes.length === 0 && (
            <div className="px-6 py-6 text-center text-sm text-brand-gray-500">No quotes available yet.</div>
          )}
        </div>
      </div>

      <div id="invoices" className="bg-white rounded-xl shadow border border-brand-gray-100">
        <div className="px-6 py-4 border-b border-brand-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-brand-gray-900">Invoices</h2>
          <p className="text-xs text-brand-gray-500">Secure payments and past receipts in one place.</p>
        </div>
        <div className="divide-y divide-brand-gray-50">
          {clientInvoices.map(invoice => (
            <div key={invoice.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="font-semibold text-brand-gray-900">Invoice #{invoice.id}</p>
                <p className="text-sm text-brand-gray-500">Due {new Date(invoice.dueDate).toLocaleDateString()}</p>
                <div className={`mt-2 inline-flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full ${
                  invoice.status === 'Paid'
                    ? 'bg-brand-green-50 text-brand-green-700'
                    : 'bg-red-50 text-red-700'
                }`}>
                  {invoice.status}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-brand-gray-900">{formatCurrency(invoice.amount)}</span>
                <Link
                  to={`/portal/invoice/${invoice.id}`}
                  className="inline-flex items-center gap-2 rounded-md border border-brand-gray-200 px-4 py-2 text-sm font-semibold text-brand-gray-800 hover:border-brand-green-400"
                >
                  <CreditCardIcon className="w-5 h-5" />
                  View / Pay
                </Link>
              </div>
            </div>
          ))}
          {clientInvoices.length === 0 && (
            <div className="px-6 py-6 text-center text-sm text-brand-gray-500">No invoices available yet.</div>
          )}
        </div>
      </div>

      <div id="schedule" className="bg-white rounded-xl shadow border border-brand-gray-100">
        <div className="px-6 py-4 border-b border-brand-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-brand-gray-900">Schedule & ETA</h2>
            <p className="text-xs text-brand-gray-500">Track your upcoming visit and crew progress.</p>
          </div>
        </div>
        <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            {upcomingJob ? (
              <>
                <div className="flex items-center gap-3">
                  <CalendarDaysIcon className="w-6 h-6 text-brand-green-600" />
                  <div>
                    <p className="text-sm text-brand-gray-500">Scheduled</p>
                    <p className="text-lg font-semibold text-brand-gray-900">
                      {upcomingJob.scheduledDate ? new Date(upcomingJob.scheduledDate).toLocaleString() : 'Date to be confirmed'}
                    </p>
                    <p className="text-sm text-brand-gray-600">Crew: {upcomingJob.assignedCrew.length > 0 ? upcomingJob.assignedCrew.length : 'TBD'} members</p>
                  </div>
                </div>
                <div className="bg-brand-gray-50 rounded-md border border-brand-gray-200 p-4">
                  <p className="text-sm font-semibold text-brand-gray-800">What to expect</p>
                  <p className="text-sm text-brand-gray-600 mt-1">{etaCopy}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link
                    to={`/portal/job/${upcomingJob.id}`}
                    className="inline-flex items-center gap-2 rounded-md bg-brand-green-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-brand-green-700"
                  >
                    <ClockIcon className="w-5 h-5" />
                    Track job
                  </Link>
                  <a
                    href="#request"
                    className="inline-flex items-center gap-2 rounded-md border border-brand-gray-200 px-4 py-2 text-sm font-semibold text-brand-gray-800 hover:border-brand-green-400"
                  >
                    Reschedule
                  </a>
                </div>
              </>
            ) : (
              <div className="bg-brand-gray-50 rounded-md border border-brand-gray-200 p-4">
                <p className="text-sm font-semibold text-brand-gray-800">We have your request.</p>
                <p className="text-sm text-brand-gray-600 mt-1">We will share available dates shortly. You can also request a date below.</p>
              </div>
            )}
          </div>
          <div className="bg-brand-green-50 rounded-lg border border-brand-green-100 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircleIcon className="w-6 h-6 text-brand-green-600" />
              <div>
                <p className="text-sm font-semibold text-brand-gray-900">Stay in the loop</p>
                <p className="text-xs text-brand-gray-700">We will text/email ETAs and updates as the crew drives, starts, and completes your work.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <ChatBubbleLeftRightIcon className="w-6 h-6 text-brand-green-600" />
              <div>
                <p className="text-sm font-semibold text-brand-gray-900">Need anything?</p>
                <p className="text-xs text-brand-gray-700">Send us a message inside any quote or job to reach the dispatcher quickly.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div id="request" className="bg-white rounded-xl shadow border border-brand-gray-100">
        <div className="px-6 py-4 border-b border-brand-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-brand-gray-900">Request new work</h2>
            <p className="text-xs text-brand-gray-500">Describe the tree care you need and add photos for faster AI quoting.</p>
          </div>
        </div>
        <form className="px-6 py-5 space-y-4" onSubmit={handleRequestSubmit}>
          {submitMessage && (
            <div className="p-3 rounded-md bg-brand-green-50 border border-brand-green-100 text-sm text-brand-green-800">
              {submitMessage}
            </div>
          )}
          {submitError && (
            <div className="p-3 rounded-md bg-red-50 border border-red-100 text-sm text-red-700">
              {submitError}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-brand-gray-800">Service needed</label>
              <input
                type="text"
                value={requestDetails.service}
                onChange={e => setRequestDetails(prev => ({ ...prev, service: e.target.value }))}
                className="mt-1 block w-full rounded-md border-brand-gray-200 shadow-sm focus:border-brand-green-500 focus:ring-brand-green-500"
                placeholder="Tree removal, pruning, stump grinding..."
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-brand-gray-800">Preferred date</label>
              <input
                type="date"
                value={requestDetails.preferredDate}
                onChange={e => setRequestDetails(prev => ({ ...prev, preferredDate: e.target.value }))}
                className="mt-1 block w-full rounded-md border-brand-gray-200 shadow-sm focus:border-brand-green-500 focus:ring-brand-green-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-brand-gray-800">Describe the work</label>
            <textarea
              value={requestDetails.description}
              onChange={e => setRequestDetails(prev => ({ ...prev, description: e.target.value }))}
              className="mt-1 block w-full rounded-md border-brand-gray-200 shadow-sm focus:border-brand-green-500 focus:ring-brand-green-500"
              rows={4}
              placeholder="Tree location, concerns, access notes, gate codes, hazards..."
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-brand-gray-800">Contact name</label>
              <input
                type="text"
                value={requestDetails.contactName}
                onChange={e => setRequestDetails(prev => ({ ...prev, contactName: e.target.value }))}
                className="mt-1 block w-full rounded-md border-brand-gray-200 shadow-sm focus:border-brand-green-500 focus:ring-brand-green-500"
                placeholder="Who should we coordinate with?"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-brand-gray-800">Email</label>
              <input
                type="email"
                value={requestDetails.contactEmail}
                onChange={e => setRequestDetails(prev => ({ ...prev, contactEmail: e.target.value }))}
                className="mt-1 block w-full rounded-md border-brand-gray-200 shadow-sm focus:border-brand-green-500 focus:ring-brand-green-500"
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-brand-gray-800">Phone</label>
              <input
                type="tel"
                value={requestDetails.contactPhone}
                onChange={e => setRequestDetails(prev => ({ ...prev, contactPhone: e.target.value }))}
                className="mt-1 block w-full rounded-md border-brand-gray-200 shadow-sm focus:border-brand-green-500 focus:ring-brand-green-500"
                placeholder="(555) 123-4567"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-brand-gray-800">Service address</label>
            <input
              type="text"
              value={requestDetails.address}
              onChange={e => setRequestDetails(prev => ({ ...prev, address: e.target.value }))}
              className="mt-1 block w-full rounded-md border-brand-gray-200 shadow-sm focus:border-brand-green-500 focus:ring-brand-green-500"
              placeholder="Street, City, State"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-brand-gray-800">Photos or video</label>
            <p className="text-xs text-brand-gray-500">Optional – add site photos to help us price faster.</p>
            <div className="flex flex-wrap gap-3">
              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-brand-gray-200 text-sm font-semibold text-brand-gray-800 hover:border-brand-green-400 cursor-pointer">
                <CameraIcon className="w-5 h-5" />
                Add files
                <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleFileUpload} />
              </label>
            </div>
            {uploads.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {uploads.map(upload => (
                  <div key={upload.localId} className="border border-brand-gray-200 rounded-md overflow-hidden bg-brand-gray-50">
                    {upload.type.startsWith('video') ? (
                      <video src={upload.url} className="w-full h-28 object-cover" controls />
                    ) : (
                      <img src={upload.url} alt={upload.name} className="w-full h-28 object-cover" />
                    )}
                    <div className="px-3 py-2 flex items-center justify-between text-xs text-brand-gray-600">
                      <span className="truncate" title={upload.name}>{upload.name}</span>
                      <button
                        type="button"
                        className="text-brand-gray-500 hover:text-red-600"
                        onClick={() => setUploads(prev => prev.filter(u => u.localId !== upload.localId))}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-md bg-brand-green-600 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-brand-green-700 disabled:opacity-60"
            >
              {isSubmitting && <SpinnerIcon className="w-5 h-5 animate-spin" />}
              Submit request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClientHub;
