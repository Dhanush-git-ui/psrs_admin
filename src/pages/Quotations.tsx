import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FileText, Search, Filter, Calendar, MapPin, 
  Mail, Phone, Building, Flag, Clock, CheckCircle, 
  XCircle, Info, ChevronRight 
} from 'lucide-react';

interface QuoteItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
}

interface Quotation {
  id: string;
  name: string;
  email: string;
  company: string;
  phone: string;
  country: string;
  port: string;
  urgency: string;
  message: string | null;
  items: QuoteItem[];
  status: 'PENDING' | 'REVIEWED' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
}

export default function Quotations() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedQuote, setSelectedQuote] = useState<Quotation | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchQuotations = async () => {
    try {
      const response = await axios.get('/api/quotations');
      setQuotations(response.data);
    } catch (err) {
      console.error('Failed to fetch quotations', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, []);

  const handleStatusChange = async (id: string, newStatus: string) => {
    setActionLoading(true);
    try {
      const response = await axios.patch(`/api/quotations/${id}`, { status: newStatus });
      
      // Update local state
      setQuotations(prev => prev.map(q => q.id === id ? response.data : q));
      if (selectedQuote?.id === id) {
        setSelectedQuote(response.data);
      }
    } catch (err) {
      console.error('Failed to update status', err);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredQuotes = quotations.filter(q => {
    const matchesSearch = 
      q.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || q.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header toolbar */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        {/* Search */}
        <div className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search quotations by name, company, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-psr-border rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-psr-red/30 focus:border-psr-red transition-all"
            />
            <Search className="w-4 h-4 text-psr-textSecondary absolute left-4 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1.5 p-1 bg-white border border-psr-border rounded-xl">
          {['ALL', 'PENDING', 'REVIEWED', 'APPROVED', 'REJECTED'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                statusFilter === status
                  ? 'bg-psr-red text-white shadow-sm'
                  : 'text-psr-textSecondary hover:text-psr-red'
              }`}
            >
              {status.toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Quotations List Table */}
        <div className="lg:col-span-8 bg-white border border-psr-border rounded-2xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="text-center p-12 text-sm text-psr-textSecondary animate-pulse">Loading quotations...</div>
          ) : filteredQuotes.length === 0 ? (
            <div className="text-center p-16 text-sm text-psr-textSecondary space-y-2">
              <FileText className="w-10 h-10 mx-auto text-psr-textSecondary/40" />
              <p className="font-semibold text-psr-textPrimary">No quotations found</p>
              <p className="text-xs">Incoming quotes from the client portal will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-psr-bg border-b border-psr-border font-heading text-[10px] font-bold uppercase tracking-wider text-psr-textSecondary">
                    <th className="py-4 px-6">Client Details</th>
                    <th className="py-4 px-6">Urgency</th>
                    <th className="py-4 px-6">Items Count</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-right">Received</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQuotes.map((quote) => {
                    const dateStr = new Date(quote.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    });

                    return (
                      <tr
                        key={quote.id}
                        onClick={() => setSelectedQuote(quote)}
                        className={`border-b border-psr-border cursor-pointer hover:bg-psr-lightRed/20 transition-all ${
                          selectedQuote?.id === quote.id ? 'bg-psr-lightRed/30 font-medium' : ''
                        }`}
                      >
                        <td className="py-4 px-6">
                          <span className="font-bold text-psr-textPrimary block">{quote.name}</span>
                          <span className="text-xs text-psr-textSecondary block">{quote.company} | {quote.email}</span>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                            quote.urgency === 'urgent'
                              ? 'bg-red-50 text-psr-danger'
                              : quote.urgency === 'routine'
                              ? 'bg-blue-50 text-blue-600'
                              : 'bg-amber-50 text-psr-warning'
                          }`}>
                            {quote.urgency}
                          </span>
                        </td>
                        <td className="py-4 px-6 font-semibold text-psr-textPrimary">
                          {quote.items ? quote.items.length : 0} items
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded uppercase tracking-wider ${
                            quote.status === 'PENDING'
                              ? 'bg-psr-lightRed text-psr-red'
                              : quote.status === 'REVIEWED'
                              ? 'bg-amber-100 text-amber-700'
                              : quote.status === 'APPROVED'
                              ? 'bg-green-100 text-psr-success'
                              : 'bg-gray-100 text-psr-textSecondary'
                          }`}>
                            {quote.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right text-xs text-psr-textSecondary font-semibold">
                          {dateStr}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Selected Quote Details Inspector Sidebar */}
        <div className="lg:col-span-4">
          {selectedQuote ? (
            <div className="bg-white border border-psr-border rounded-2xl p-6 shadow-sm space-y-6 sticky top-24">
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-heading text-[9px] font-bold uppercase tracking-widest text-psr-red px-2 py-0.5 rounded bg-psr-lightRed border border-psr-red/10 inline-block mb-1.5">
                    Quotation Request
                  </span>
                  <h3 className="font-heading font-bold text-lg text-psr-textPrimary">
                    {selectedQuote.name}
                  </h3>
                  <span className="text-xs text-psr-textSecondary block font-mono">ID: {selectedQuote.id.slice(0, 8)}...</span>
                </div>
              </div>

              {/* Status Update Actions */}
              <div className="p-4 rounded-xl bg-psr-bg border border-psr-border space-y-3">
                <span className="font-heading text-[10px] font-bold uppercase tracking-wider text-psr-textSecondary block">
                  Workflow Action Status
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    disabled={actionLoading}
                    onClick={() => handleStatusChange(selectedQuote.id, 'REVIEWED')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
                      selectedQuote.status === 'REVIEWED'
                        ? 'bg-amber-500 text-white'
                        : 'bg-white hover:bg-amber-50 border border-psr-border text-amber-700'
                    }`}
                  >
                    Reviewed
                  </button>
                  <button
                    disabled={actionLoading}
                    onClick={() => handleStatusChange(selectedQuote.id, 'APPROVED')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
                      selectedQuote.status === 'APPROVED'
                        ? 'bg-green-600 text-white'
                        : 'bg-white hover:bg-green-50 border border-psr-border text-psr-success'
                    }`}
                  >
                    Approve
                  </button>
                  <button
                    disabled={actionLoading}
                    onClick={() => handleStatusChange(selectedQuote.id, 'REJECTED')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
                      selectedQuote.status === 'REJECTED'
                        ? 'bg-psr-red text-white'
                        : 'bg-white hover:bg-red-50 border border-psr-border text-psr-red'
                    }`}
                  >
                    Reject
                  </button>
                </div>
              </div>

              {/* Contact Card details */}
              <div className="space-y-3 font-sans text-xs">
                <h4 className="font-heading text-[10px] font-bold uppercase tracking-wider text-psr-textSecondary border-b border-psr-border pb-1">
                  Contact Information
                </h4>
                <div className="flex items-center gap-2 text-psr-textPrimary">
                  <Building size={14} className="text-psr-textSecondary" />
                  <span className="font-semibold">{selectedQuote.company}</span>
                </div>
                <div className="flex items-center gap-2 text-psr-textPrimary">
                  <Mail size={14} className="text-psr-textSecondary" />
                  <a href={`mailto:${selectedQuote.email}`} className="hover:underline">{selectedQuote.email}</a>
                </div>
                <div className="flex items-center gap-2 text-psr-textPrimary">
                  <Phone size={14} className="text-psr-textSecondary" />
                  <span>{selectedQuote.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-psr-textPrimary">
                  <Flag size={14} className="text-psr-textSecondary" />
                  <span>{selectedQuote.country} (Port: {selectedQuote.port})</span>
                </div>
              </div>

              {/* Notes */}
              {selectedQuote.message && (
                <div className="space-y-1.5 font-sans text-xs bg-psr-bg p-3.5 border border-psr-border rounded-xl">
                  <span className="font-heading text-[10px] font-bold uppercase tracking-wider text-psr-textSecondary block">
                    Custom Specs / Notes
                  </span>
                  <p className="text-psr-textPrimary leading-relaxed whitespace-pre-line italic">
                    "{selectedQuote.message}"
                  </p>
                </div>
              )}

              {/* Items Table */}
              <div className="space-y-2">
                <h4 className="font-heading text-[10px] font-bold uppercase tracking-wider text-psr-textSecondary border-b border-psr-border pb-1">
                  Requested Equipment
                </h4>
                <div className="border border-psr-border rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-psr-bg border-b border-psr-border font-heading text-[9px] font-bold uppercase tracking-wider text-psr-textSecondary">
                        <th className="py-2.5 px-3">Item name</th>
                        <th className="py-2.5 px-3 text-right">Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedQuote.items && selectedQuote.items.map((item, idx) => (
                        <tr key={idx} className="border-b border-psr-border/50 last:border-b-0">
                          <td className="py-2 px-3">
                            <span className="font-bold text-psr-textPrimary block">{item.name}</span>
                            <span className="text-[10px] text-psr-textSecondary">{item.category}</span>
                          </td>
                          <td className="py-2 px-3 text-right font-semibold text-psr-textPrimary">
                            {item.quantity}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 border border-dashed border-psr-border rounded-2xl bg-white text-center space-y-3 sticky top-24 shadow-sm">
              <FileText className="mx-auto text-psr-textSecondary/30" size={32} />
              <h5 className="font-heading text-sm font-bold text-psr-textPrimary">Inspector Panel</h5>
              <p className="font-sans text-xs text-psr-textSecondary leading-relaxed">
                Select a quotation from the list to inspect client info, custom notes, requested drill packages, and change their workflow status.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
