import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  MapPin, 
  AlertCircle, 
  Plus, 
  Minus, 
  RefreshCw, 
  Package, 
  CheckCircle2, 
  Sparkles,
  ExternalLink
} from 'lucide-react';
import axios from 'axios';

interface Product {
  id: string;
  name: string;
  sku: string;
  code: string;
  category?: { name: string } | string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  status: string;
  material?: string;
  dimensions?: string;
  weight?: number;
  images?: string[];
  imageUrl?: string;
  stockLocations?: any[];
  warehouse?: string;
  rack?: string;
  rackPosition?: string;
}

export default function Inventory() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [adjustingId, setAdjustingId] = useState<string | null>(null);

  const fetchInventory = async () => {
    try {
      const response = await axios.get('/api/products');
      if (Array.isArray(response.data)) {
        setProducts(response.data);
      } else {
        const fallbackRes = await axios.get('/api/inventory');
        if (Array.isArray(fallbackRes.data)) {
          setProducts(fallbackRes.data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch inventory', err);
      // Fallback to /api/inventory
      try {
        const fallbackRes = await axios.get('/api/inventory');
        if (Array.isArray(fallbackRes.data)) {
          setProducts(fallbackRes.data);
        }
      } catch (fallbackErr) {
        console.error('Fallback fetch also failed', fallbackErr);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleQuickAdjust = async (product: Product, delta: number) => {
    const action = delta > 0 ? 'INBOUND' : 'OUTBOUND';
    const quantity = Math.abs(delta);

    if (action === 'OUTBOUND' && product.currentStock < quantity) {
      alert('Cannot reduce stock below 0.');
      return;
    }

    setAdjustingId(product.id);
    try {
      await axios.post('/api/products/adjust-stock', {
        productId: product.id,
        sku: product.sku,
        action,
        quantity,
        reason: `Quick ${action.toLowerCase()} adjustment via Inventory Manager`
      });

      // Optimistically update local state
      setProducts(prev => prev.map(p => {
        if (p.id === product.id) {
          const newStock = Math.max(0, p.currentStock + delta);
          let newStatus = 'AVAILABLE';
          if (newStock === 0) newStatus = 'OUT_OF_STOCK';
          else if (newStock < (p.minStock || 10)) newStatus = 'LOW_STOCK';
          return { ...p, currentStock: newStock, status: newStatus };
        }
        return p;
      }));
    } catch (err: any) {
      console.error('Failed to adjust stock', err);
      alert('Failed to update stock: ' + (err.response?.data?.error || err.message));
    } finally {
      setAdjustingId(null);
    }
  };

  // Get unique categories
  const categories = Array.from(new Set(
    products.map(p => typeof p.category === 'object' ? p.category?.name : p.category).filter(Boolean)
  ));

  const filteredProducts = products.filter(p => {
    const catName = typeof p.category === 'object' ? p.category?.name || '' : (p.category || '');
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (p.code && p.code.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = categoryFilter === 'all' || catName.toLowerCase() === categoryFilter.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Search & Header */}
      <div className="bg-white p-5 rounded-2xl border border-psr-border shadow-xs flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-psr-textPrimary">Live Inventory & Stock Manager</h2>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Realtime Synced
            </span>
          </div>
          <p className="text-xs text-psr-textSecondary mt-1">
            Monitor stock levels, adjust item quantities, and sync directly to{' '}
            <a 
              href="https://drills-dun.vercel.app/products" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-psr-red hover:underline font-semibold inline-flex items-center gap-0.5"
            >
              drills-dun.vercel.app/products <ExternalLink className="w-3 h-3 inline" />
            </a>
          </p>
        </div>

        <button
          onClick={() => { setIsLoading(true); fetchInventory().finally(() => setIsLoading(false)); }}
          className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-psr-border bg-white text-xs font-semibold text-psr-textSecondary hover:bg-psr-bg hover:text-psr-textPrimary transition-all cursor-pointer shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Stock
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-psr-textSecondary" />
          <input
            type="text"
            placeholder="Search inventory by product name, SKU, or custom code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-psr-border rounded-xl text-sm focus:outline-none focus:border-psr-red focus:ring-1 focus:ring-psr-red"
          />
        </div>
        
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-full sm:w-auto px-4 py-2.5 bg-white border border-psr-border rounded-xl text-sm focus:outline-none focus:border-psr-red"
        >
          <option value="all">All Categories ({products.length})</option>
          {categories.map(cat => (
            <option key={cat as string} value={cat as string}>{cat as string}</option>
          ))}
        </select>
      </div>

      {/* Grid of Product Cards */}
      {isLoading ? (
        <div className="text-center p-16 text-sm text-psr-textSecondary animate-pulse flex flex-col items-center justify-center gap-3 bg-white rounded-2xl border border-psr-border">
          <RefreshCw className="w-6 h-6 animate-spin text-psr-red" />
          Loading warehouse inventory records...
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center p-16 text-sm text-psr-textSecondary flex flex-col items-center justify-center gap-3 bg-white rounded-2xl border border-psr-border">
          <div className="w-12 h-12 rounded-2xl bg-psr-bg flex items-center justify-center text-psr-textSecondary">
            <Package className="w-6 h-6" />
          </div>
          <p className="font-semibold text-psr-textPrimary">No inventory items found</p>
          <p className="text-xs text-psr-textSecondary">Try adjusting your search query or category filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProducts.map((product) => {
            const imgUrl = (product.images && product.images[0]) || product.imageUrl || '/images/inventory/IMG_3086.jpg';
            const catName = typeof product.category === 'object' ? product.category?.name || 'General' : (product.category || 'General');
            const isLowStock = product.currentStock < (product.minStock || 10);
            const isOutOfStock = product.currentStock <= 0;
            const isAdjusting = adjustingId === product.id;

            return (
              <div 
                key={product.id} 
                className="bg-white rounded-2xl border border-psr-border p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start gap-3">
                    <div className="w-14 h-14 rounded-xl border border-psr-border overflow-hidden bg-brand-softwhite shrink-0">
                      <img
                        src={imgUrl}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?q=80&w=150';
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] text-psr-textSecondary font-semibold uppercase">{product.code || product.sku}</span>
                      <h3 className="font-heading font-bold text-sm text-psr-textPrimary truncate" title={product.name}>
                        {product.name}
                      </h3>
                      <span className="inline-block px-2 py-0.5 mt-1 rounded bg-psr-bg text-[10px] font-semibold text-psr-textSecondary">
                        {catName}
                      </span>
                    </div>
                  </div>

                  {/* Stock Levels & Status */}
                  <div className="grid grid-cols-2 gap-3 mt-4 p-3 bg-psr-bg/40 rounded-xl border border-psr-border/50 text-xs">
                    <div>
                      <span className="text-[10px] text-psr-textSecondary block">Current Stock</span>
                      <span className={`font-bold font-mono text-base flex items-center gap-1 ${
                        isOutOfStock ? 'text-red-600' : isLowStock ? 'text-amber-600' : 'text-emerald-600'
                      }`}>
                        {product.currentStock} units
                        {isLowStock && <AlertCircle className="w-3.5 h-3.5 inline" />}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-psr-textSecondary block">Min / Max Level</span>
                      <span className="font-semibold text-psr-textPrimary font-mono">
                        {product.minStock || 10} / {product.maxStock || 1000}
                      </span>
                    </div>
                  </div>

                  {/* Quick Adjust Buttons */}
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-psr-textSecondary">Quick Adjust:</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleQuickAdjust(product, -1)}
                        disabled={isAdjusting || isOutOfStock}
                        className="p-1.5 rounded-lg border border-psr-border bg-white text-psr-textSecondary hover:text-psr-red hover:bg-psr-lightRed transition-all cursor-pointer disabled:opacity-40"
                        title="Decrease 1 unit"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleQuickAdjust(product, 1)}
                        disabled={isAdjusting}
                        className="p-1.5 rounded-lg border border-psr-border bg-white text-psr-textSecondary hover:text-emerald-600 hover:bg-emerald-50 transition-all cursor-pointer disabled:opacity-40"
                        title="Add 1 unit"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleQuickAdjust(product, 10)}
                        disabled={isAdjusting}
                        className="px-2 py-1 rounded-lg border border-psr-border bg-white text-[11px] font-bold text-psr-textSecondary hover:text-emerald-600 hover:bg-emerald-50 transition-all cursor-pointer disabled:opacity-40"
                        title="Add 10 units"
                      >
                        +10
                      </button>
                    </div>
                  </div>
                </div>

                {/* Location Footer */}
                <div className="flex items-center justify-between border-t border-psr-border mt-4 pt-3 text-[11px]">
                  <span className="text-psr-textSecondary flex items-center gap-1 truncate">
                    <MapPin className="w-3.5 h-3.5 text-psr-red shrink-0" />
                    {product.warehouse || 'Main Warehouse'} - {product.rack || 'Rack A'}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    isOutOfStock 
                      ? 'bg-red-50 text-red-700 border border-red-200' 
                      : isLowStock 
                      ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}>
                    {isOutOfStock ? 'Out of Stock' : isLowStock ? 'Low Stock' : 'In Stock'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
