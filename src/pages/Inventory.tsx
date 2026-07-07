// client/src/pages/Inventory.tsx
import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Mic, 
  Filter, 
  MoreVertical, 
  MapPin, 
  AlertCircle 
} from 'lucide-react';
import axios from 'axios';

interface Product {
  id: string;
  name: string;
  sku: string;
  code: string;
  currentStock: number;
  minStock: number;
  status: string;
}

export default function Inventory() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchInventory = async () => {
    try {
      const response = await axios.get('/api/products');
      setProducts(response.data);
    } catch (err) {
      console.error('Failed to fetch inventory', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleAiSmartSearch = async () => {
    if (!searchQuery) {
      fetchInventory();
      return;
    }
    setIsAiSearching(true);
    try {
      const response = await axios.post('/api/ai/search', { query: searchQuery });
      if (response.data?.results) {
        setProducts(response.data.results);
      }
    } catch (err) {
      console.error('AI smart search error', err);
    } finally {
      setIsAiSearching(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        {/* Search Bar Wrapper */}
        <div className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search products by SKU or ask AI: 'Show low stock bits in Warehouse A'..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAiSmartSearch()}
              className="w-full bg-white border border-psr-border rounded-xl pl-11 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-psr-red/30 focus:border-psr-red transition-all"
            />
            <Search className="w-4 h-4 text-psr-textSecondary absolute left-4 top-1/2 -translate-y-1/2" />
            <button 
              onClick={handleAiSmartSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-psr-lightRed text-psr-textSecondary hover:text-psr-red rounded-lg transition-all"
              title="Speech-to-Text Command"
            >
              <Mic className={`w-4 h-4 ${isAiSearching ? 'text-psr-red animate-pulse' : ''}`} />
            </button>
          </div>
          <button 
            onClick={handleAiSmartSearch}
            className="px-5 py-3 rounded-xl bg-psr-red hover:bg-psr-darkRed text-white font-medium text-sm transition-all shadow-sm"
          >
            Query
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="flex gap-2">
          <button className="flex items-center gap-2 bg-white border border-psr-border rounded-xl px-4 py-3 text-sm font-semibold hover:bg-psr-bg transition-all">
            <Filter className="w-4 h-4" /> Filters
          </button>
        </div>
      </div>

      {/* Grid of Product Cards */}
      {isLoading ? (
        <div className="text-center p-12 text-sm text-psr-textSecondary animate-pulse">Loading inventory...</div>
      ) : products.length === 0 ? (
        <div className="text-center p-12 text-sm text-psr-textSecondary">No inventory items found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <div key={product.id} className="bg-white rounded-xl border border-psr-border p-5 shadow-sm hover-lift flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs text-psr-textSecondary font-semibold uppercase">{product.code}</span>
                    <h3 className="font-heading font-bold text-base mt-1 text-psr-textPrimary">{product.name}</h3>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    product.status === 'AVAILABLE' 
                      ? 'bg-green-50 text-psr-success' 
                      : product.status === 'LOW_STOCK'
                      ? 'bg-amber-50 text-psr-warning'
                      : 'bg-red-50 text-psr-danger'
                  }`}>{product.status ? product.status.replace('_', ' ') : ''}</span>
                </div>

                {/* Attributes */}
                <div className="grid grid-cols-2 gap-4 mt-6 text-sm">
                  <div>
                    <span className="text-xs text-psr-textSecondary block">SKU Code</span>
                    <span className="font-semibold">{product.sku}</span>
                  </div>
                  <div>
                    <span className="text-xs text-psr-textSecondary block">Stock Level</span>
                    <span className={`font-semibold font-numbers flex items-center gap-1 ${
                      product.currentStock < product.minStock ? 'text-psr-red' : ''
                    }`}>
                      {product.currentStock} / {product.minStock} min
                      {product.currentStock < product.minStock && <AlertCircle className="w-3.5 h-3.5" />}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-between border-t border-psr-border mt-6 pt-4 text-xs">
                <span className="text-psr-textSecondary flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> Warehouse A - Rack B
                </span>
                <button className="text-psr-red font-semibold hover:underline">Manage Location</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
