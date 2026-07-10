import React, { useState, useEffect } from 'react';
import { ArrowDownLeft, AlertCircle } from 'lucide-react';
import axios from 'axios';

export default function StockOut() {
  const [formData, setFormData] = useState({
    sku: '',
    quantity: 1,
    projectCode: '',
    purpose: 'Assigned to Project Site',
    remarks: '',
  });

  const [products, setProducts] = useState<any[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchProducts = async () => {
    try {
      const res = await axios.get('/api/products');
      setProducts(res.data);
    } catch (err) {
      console.error('Failed to fetch products', err);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.sku) {
      alert('Please choose a product SKU first.');
      return;
    }
    setIsSubmitting(true);
    try {
      await axios.post('/api/products/adjust-stock', {
        sku: formData.sku,
        quantity: formData.quantity,
        action: 'OUTBOUND'
      });
      alert('Stock removal entry logged successfully! Stock levels updated and public site cache revalidated.');
      // Reset form fields
      setFormData({
        sku: '',
        quantity: 1,
        projectCode: '',
        purpose: 'Assigned to Project Site',
        remarks: '',
      });
    } catch (err: any) {
      console.error(err);
      alert('Failed to log stock release: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl bg-white border border-psr-border rounded-xl p-6 shadow-sm mx-auto">
      <h3 className="font-heading font-semibold text-base pb-4 border-b border-psr-border flex items-center gap-2">
        <ArrowDownLeft className="w-5 h-5 text-psr-red" /> Outbound Stock exit Registry
      </h3>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-psr-textSecondary block mb-1">Select Product SKU</label>
            <select
              required
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              className="w-full border border-psr-border rounded-lg px-3 py-2 text-sm focus:outline-none bg-white"
            >
              <option value="">-- Choose Item --</option>
              {isLoadingProducts ? (
                <option value="">Loading products...</option>
              ) : products.length === 0 ? (
                <option value="">No products registered. Create one in Products page first.</option>
              ) : (
                products.map((prod) => (
                  <option key={prod.id} value={prod.sku}>
                    {prod.sku} — {prod.name}
                  </option>
                ))
              )}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-psr-textSecondary block mb-1">Quantity to Release</label>
            <input
              required
              type="number"
              min={1}
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
              className="w-full border border-psr-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-psr-red"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-psr-textSecondary block mb-1">Project Site Code</label>
            <input
              required
              type="text"
              value={formData.projectCode}
              onChange={(e) => setFormData({ ...formData, projectCode: e.target.value })}
              className="w-full border border-psr-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-psr-red"
              placeholder="e.g. PRJ-METRO-09"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-psr-textSecondary block mb-1">Reason / Purpose</label>
            <select
              value={formData.purpose}
              onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              className="w-full border border-psr-border rounded-lg px-3 py-2 text-sm focus:outline-none bg-white focus:border-psr-red"
            >
              <option>Assigned to Project Site</option>
              <option>Transferred to Warehouse B</option>
              <option>Returned to Supplier</option>
              <option>Scrapped / Damaged</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-psr-textSecondary block mb-1">Remarks</label>
          <textarea
            value={formData.remarks}
            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
            className="w-full border border-psr-border rounded-lg px-3 py-2 text-sm focus:outline-none h-24 focus:border-psr-red"
            placeholder="Log engineer names or extra dispatch parameters..."
          ></textarea>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3 text-xs text-amber-800">
          <AlertCircle className="w-5 h-5 text-psr-warning flex-shrink-0" />
          <div>
            <span className="font-bold">Important Notice:</span> Releasing items subtracts the requested quantity from the physical racks and updates the live site specs instantly. Ensure the physical transaction matches this log.
          </div>
        </div>

        <div className="pt-6 border-t border-psr-border flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-lg bg-psr-red hover:bg-psr-darkRed text-white text-sm font-semibold shadow-sm transition-all"
          >
            {isSubmitting ? 'Releasing...' : 'Release Stock Inventory'}
          </button>
        </div>
      </form>
    </div>
  );
}
