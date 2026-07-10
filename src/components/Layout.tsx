// client/src/components/Layout.tsx
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  Boxes, 
  Warehouse, 
  PlusSquare, 
  MinusSquare, 
  LogOut, 
  Bell, 
  Search,
  X,
  FileText,
  Mail,
  Phone,
  Globe,
  Anchor,
  Clock
} from 'lucide-react';
import { UserButton, useUser } from '@clerk/clerk-react';
import axios from 'axios';

interface QuotationItem {
  productId: string;
  name: string;
  category: string;
  quantity: number;
  specs: string;
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
  items: QuotationItem[];
  status: string;
  createdAt: string;
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const location = useLocation();

  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);

  const fetchQuotations = async () => {
    try {
      const response = await axios.get('/api/quotations');
      setQuotations(response.data);
    } catch (err) {
      console.error('Failed to fetch quotations', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchQuotations();
      // Poll every 30 seconds for live updates
      const interval = setInterval(fetchQuotations, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      await axios.patch(`/api/quotations/${id}/status`, { status: newStatus });
      fetchQuotations();
      setSelectedQuotation(prev => prev ? { ...prev, status: newStatus } : null);
    } catch (err) {
      console.error('Failed to update quotation status', err);
    }
  };

  const pendingQuotations = quotations.filter(q => q.status === 'PENDING');

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Inventory', href: '/inventory', icon: Boxes },
    { name: 'Products', href: '/products', icon: Package },
    { name: 'Warehouse Grid', href: '/warehouse', icon: Warehouse },
    { name: 'Stock Entry', href: '/stock-entry', icon: PlusSquare },
    { name: 'Stock Out', href: '/stock-out', icon: MinusSquare },
    { name: 'Quotations', href: '/quotations', icon: FileText },
  ];

  return (
    <div className="flex h-screen bg-psr-bg overflow-hidden font-body text-psr-textPrimary">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 glass-panel border-r border-psr-border">
        {/* Brand */}
        <div className="h-16 flex items-center px-6 gap-2 border-b border-psr-border">
          <div className="w-8 h-8 rounded bg-psr-red flex items-center justify-center text-white font-heading font-bold text-lg">
            P
          </div>
          <span className="font-heading font-semibold text-lg tracking-tight">PSR Admin</span>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-psr-red text-white shadow-premium'
                    : 'text-psr-textSecondary hover:bg-psr-lightRed hover:text-psr-red'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User Card */}
        <div className="p-4 border-t border-psr-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UserButton afterSignOutUrl="/login" />
            <div className="flex flex-col text-left">
              <span className="text-xs font-semibold">{user?.fullName || 'User'}</span>
              <span className="text-[10px] text-psr-textSecondary">Warehouse Staff</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Body container */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-psr-border flex items-center justify-between px-6 z-10">
          <h1 className="font-heading font-semibold text-xl tracking-tight">
            {navigation.find((n) => n.href === location.pathname)?.name || 'PSR Warehouse'}
          </h1>

          <div className="flex items-center gap-4">
            {/* Search Trigger */}
            <button className="p-2 text-psr-textSecondary hover:text-psr-red hover:bg-psr-lightRed rounded-full transition-all">
              <Search className="w-5 h-5" />
            </button>

            {/* Notification Bell wrapper */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-psr-textSecondary hover:text-psr-red hover:bg-psr-lightRed rounded-full transition-all relative"
              >
                <Bell className="w-5 h-5" />
                {pendingQuotations.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-psr-red rounded-full ring-2 ring-white text-[9px] font-bold text-white flex items-center justify-center">
                    {pendingQuotations.length}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Menu */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-88 bg-white border border-psr-border rounded-xl shadow-premium z-50 overflow-hidden animate-in fade-in slide-in-from-top-3 duration-200">
                  <div className="p-4 border-b border-psr-border flex justify-between items-center bg-psr-bg/25">
                    <span className="font-heading font-bold text-sm text-psr-textPrimary">Quotation Requests</span>
                    {pendingQuotations.length > 0 && (
                      <span className="text-[10px] bg-psr-lightRed text-psr-red font-bold px-2 py-0.5 rounded-full">
                        {pendingQuotations.length} Pending
                      </span>
                    )}
                  </div>
                  
                  <div className="max-h-[360px] overflow-y-auto divide-y divide-psr-border/40">
                    {quotations.length === 0 ? (
                      <div className="p-8 text-center text-xs text-psr-textSecondary">
                        No quotation requests found.
                      </div>
                    ) : (
                      quotations.map((q) => (
                        <button
                          key={q.id}
                          onClick={() => {
                            setSelectedQuotation(q);
                            setShowNotifications(false);
                          }}
                          className="w-full text-left p-4 hover:bg-psr-bg/20 transition-all flex flex-col gap-1 focus:outline-none"
                        >
                          <div className="flex justify-between items-start gap-2">
                            <span className="font-semibold text-xs text-psr-textPrimary truncate max-w-[170px]">{q.company}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                              q.urgency === 'HIGH' 
                                ? 'bg-red-50 text-psr-red border border-psr-red/20' 
                                : q.urgency === 'MEDIUM' 
                                ? 'bg-amber-50 text-psr-warning border border-psr-warning/20' 
                                : 'bg-blue-50 text-psr-info border border-psr-info/20'
                            }`}>
                              {q.urgency}
                            </span>
                          </div>
                          
                          <span className="text-[10px] text-psr-textSecondary">
                            From: {q.name} ({q.country})
                          </span>
                          
                          {q.message && (
                            <span className="text-[10px] text-psr-textSecondary mt-1 italic line-clamp-2 bg-psr-bg/30 p-1.5 rounded border border-psr-border/20">
                              "{q.message}"
                            </span>
                          )}
                          
                          <div className="flex items-center justify-between mt-3 pt-2 border-t border-psr-border/30 text-[9px] font-bold text-psr-textSecondary">
                            <span>{new Date(q.createdAt).toLocaleDateString()}</span>
                            <span className={`px-2 py-0.5 rounded-full ${
                              q.status === 'PENDING' 
                                ? 'bg-amber-50 text-psr-warning border border-psr-warning/20' 
                                : q.status === 'APPROVED' 
                                ? 'bg-green-50 text-psr-success border border-green-200' 
                                : q.status === 'REJECTED'
                                ? 'bg-red-50 text-psr-red border border-psr-red/20'
                                : 'bg-psr-bg text-psr-textSecondary border border-psr-border'
                            }`}>
                              {q.status}
                            </span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable Content Container */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-psr-bg">
          {children}
        </main>
      </div>

      {/* Detailed Quotation Modal */}
      {selectedQuotation && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-xs">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-psr-border bg-white sticky top-0 z-10">
              <div>
                <span className="text-[10px] font-bold text-psr-red uppercase tracking-wider">Quotation Request Detail</span>
                <h3 className="font-heading font-bold text-lg text-psr-textPrimary mt-0.5">
                  {selectedQuotation.company}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedQuotation(null)}
                className="p-2 text-psr-textSecondary hover:text-psr-red hover:bg-psr-lightRed rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Details */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2.5 p-3 rounded-xl border border-psr-border/50 bg-psr-bg/20">
                  <FileText className="w-4 h-4 text-psr-textSecondary" />
                  <div>
                    <span className="text-[10px] text-psr-textSecondary block">Contact Name</span>
                    <span className="text-xs font-semibold text-psr-textPrimary">{selectedQuotation.name}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 p-3 rounded-xl border border-psr-border/50 bg-psr-bg/20">
                  <Mail className="w-4 h-4 text-psr-textSecondary" />
                  <div>
                    <span className="text-[10px] text-psr-textSecondary block">Email Address</span>
                    <span className="text-xs font-semibold text-psr-textPrimary truncate max-w-[180px] block">{selectedQuotation.email}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 p-3 rounded-xl border border-psr-border/50 bg-psr-bg/20">
                  <Phone className="w-4 h-4 text-psr-textSecondary" />
                  <div>
                    <span className="text-[10px] text-psr-textSecondary block">Phone Number</span>
                    <span className="text-xs font-semibold text-psr-textPrimary">{selectedQuotation.phone}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 p-3 rounded-xl border border-psr-border/50 bg-psr-bg/20">
                  <Globe className="w-4 h-4 text-psr-textSecondary" />
                  <div>
                    <span className="text-[10px] text-psr-textSecondary block">Country</span>
                    <span className="text-xs font-semibold text-psr-textPrimary">{selectedQuotation.country}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 p-3 rounded-xl border border-psr-border/50 bg-psr-bg/20">
                  <Anchor className="w-4 h-4 text-psr-textSecondary" />
                  <div>
                    <span className="text-[10px] text-psr-textSecondary block">Destination Port</span>
                    <span className="text-xs font-semibold text-psr-textPrimary">{selectedQuotation.port}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 p-3 rounded-xl border border-psr-border/50 bg-psr-bg/20">
                  <Clock className="w-4 h-4 text-psr-textSecondary" />
                  <div>
                    <span className="text-[10px] text-psr-textSecondary block">Urgency / Date</span>
                    <span className="text-xs font-semibold text-psr-textPrimary">
                      {selectedQuotation.urgency} ({new Date(selectedQuotation.createdAt).toLocaleDateString()})
                    </span>
                  </div>
                </div>
              </div>

              {/* Message */}
              {selectedQuotation.message && (
                <div>
                  <span className="text-xs font-semibold text-psr-textSecondary block mb-1.5">Cover Message</span>
                  <div className="p-4 bg-psr-bg/35 rounded-xl border border-psr-border/50 text-xs leading-relaxed text-psr-textPrimary whitespace-pre-wrap italic">
                    "{selectedQuotation.message}"
                  </div>
                </div>
              )}

              {/* Items List */}
              <div>
                <span className="text-xs font-semibold text-psr-textSecondary block mb-2">Requested Items</span>
                <div className="border border-psr-border rounded-xl overflow-hidden bg-white shadow-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-psr-bg/40 border-b border-psr-border text-[10px] font-bold text-psr-textSecondary uppercase tracking-wider">
                        <th className="p-3">Product Name</th>
                        <th className="p-3">Category</th>
                        <th className="p-3 text-right">Quantity</th>
                        <th className="p-3">Specifications</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-psr-border/40 text-xs">
                      {selectedQuotation.items.map((item, index) => (
                        <tr key={index}>
                          <td className="p-3 font-semibold text-psr-textPrimary">{item.name}</td>
                          <td className="p-3 text-psr-textSecondary">{item.category}</td>
                          <td className="p-3 text-right font-bold text-psr-red">{item.quantity}</td>
                          <td className="p-3 text-psr-textSecondary">{item.specs || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer with status triggers */}
            <div className="p-6 border-t border-psr-border bg-psr-bg/10 flex flex-wrap gap-3 justify-between items-center sticky bottom-0 z-10">
              <div className="flex items-center gap-2">
                <span className="text-xs text-psr-textSecondary">Current Status:</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  selectedQuotation.status === 'PENDING' 
                    ? 'bg-amber-100 text-amber-800' 
                    : selectedQuotation.status === 'APPROVED' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {selectedQuotation.status}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                {selectedQuotation.status === 'PENDING' && (
                  <>
                    <button 
                      onClick={() => updateStatus(selectedQuotation.id, 'APPROVED')}
                      className="px-4 py-2 bg-psr-success hover:bg-green-700 text-white font-semibold text-xs rounded-xl transition-all shadow-sm"
                    >
                      Approve Request
                    </button>
                    <button 
                      onClick={() => updateStatus(selectedQuotation.id, 'REJECTED')}
                      className="px-4 py-2 bg-psr-red hover:bg-psr-darkRed text-white font-semibold text-xs rounded-xl transition-all shadow-sm"
                    >
                      Reject Request
                    </button>
                  </>
                )}
                <button 
                  onClick={() => setSelectedQuotation(null)}
                  className="px-4 py-2 bg-white border border-psr-border hover:bg-psr-bg text-psr-textPrimary font-semibold text-xs rounded-xl transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

