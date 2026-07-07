// client/src/pages/Products.tsx
import React, { useState, useEffect } from 'react';
import { Plus, Check, ArrowUpDown } from 'lucide-react';
import axios from 'axios';

export default function Products() {
  const [showModal, setShowModal] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    sku: '',
    categoryId: '',
    minStock: 10,
    maxStock: 1000,
    currentStock: 0,
    unit: 'pcs',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchProducts = async () => {
    try {
      const response = await axios.get('/api/products');
      setProducts(response.data);
    } catch (err) {
      console.error('Failed to fetch products', err);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/api/categories');
      setCategories(response.data);
      if (response.data.length > 0) {
        setFormData((prev) => ({ ...prev, categoryId: response.data[0].id }));
      }
    } catch (err) {
      console.error('Failed to fetch categories', err);
    }
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await Promise.all([fetchProducts(), fetchCategories()]);
      setIsLoading(false);
    };
    init();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await axios.post('/api/products', formData);
      setShowModal(false);
      // Reset form
      setFormData({
        name: '',
        code: '',
        sku: '',
        categoryId: categories[0]?.id || '',
        minStock: 10,
        maxStock: 1000,
        currentStock: 0,
        unit: 'pcs',
      });
      alert('Product created successfully and main site cache revalidated!');
      fetchProducts(); // Refresh list
    } catch (err: any) {
      console.error(err);
      alert('Failed to register product: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-psr-textPrimary">Products Specification Database</h2>
          <p className="text-xs text-psr-textSecondary">Manage product dimensions, technical diagrams, and master SKUs.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-psr-red hover:bg-psr-darkRed text-white text-sm font-semibold shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" /> New Product
        </button>
      </div>

      {/* Products Master table */}
      <div className="bg-white border border-psr-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-12 text-center text-sm text-psr-textSecondary animate-pulse">Loading products...</div>
          ) : products.length === 0 ? (
            <div className="p-12 text-center text-sm text-psr-textSecondary">No products found. Add your first product.</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-psr-bg text-xs font-semibold text-psr-textSecondary border-b border-psr-border">
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Code</th>
                  <th className="px-6 py-4">SKU</th>
                  <th className="px-6 py-4">Unit</th>
                  <th className="px-6 py-4">Min Stock</th>
                  <th className="px-6 py-4">Max Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-psr-border text-sm">
                {products.map((prod, idx) => (
                  <tr key={prod.id || idx} className="hover:bg-psr-bg/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-psr-textPrimary">{prod.name}</td>
                    <td className="px-6 py-4 text-xs text-psr-textSecondary">
                      <span className="px-2 py-0.5 rounded bg-psr-bg font-semibold text-psr-textPrimary">{prod.category?.name || 'General'}</span>
                    </td>
                    <td className="px-6 py-4 text-psr-textSecondary">{prod.code}</td>
                    <td className="px-6 py-4 font-semibold">{prod.sku}</td>
                    <td className="px-6 py-4">{prod.unit}</td>
                    <td className="px-6 py-4 font-numbers">{prod.minStock}</td>
                    <td className="px-6 py-4 font-numbers">{prod.maxStock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal Slide-Over Form */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden border border-psr-border">
            <div className="px-6 py-4 border-b border-psr-border flex justify-between items-center bg-psr-bg">
              <h3 className="font-heading font-semibold text-base">Add Master Product</h3>
              <button onClick={() => setShowModal(false)} className="text-psr-textSecondary hover:text-psr-red text-sm">
                Cancel
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-psr-textSecondary block mb-1">Product Name</label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-psr-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-psr-red"
                  placeholder="e.g. Rotation Motor Assembly"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-psr-textSecondary block mb-1">Unique Code</label>
                  <input
                    required
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full border border-psr-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-psr-red"
                    placeholder="PROD-1024"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-psr-textSecondary block mb-1">SKU</label>
                  <input
                    required
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full border border-psr-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-psr-red"
                    placeholder="PSR-RM-550"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-psr-textSecondary block mb-1">Category</label>
                  <select
                    required
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full border border-psr-border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-psr-red"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-psr-textSecondary block mb-1">Current Stock</label>
                  <input
                    type="number"
                    value={formData.currentStock}
                    onChange={(e) => setFormData({ ...formData, currentStock: parseInt(e.target.value) || 0 })}
                    className="w-full border border-psr-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-psr-red"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-psr-textSecondary block mb-1">Min Level</label>
                  <input
                    type="number"
                    value={formData.minStock}
                    onChange={(e) => setFormData({ ...formData, minStock: parseInt(e.target.value) || 0 })}
                    className="w-full border border-psr-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-psr-red"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-psr-textSecondary block mb-1">Max Level</label>
                  <input
                    type="number"
                    value={formData.maxStock}
                    onChange={(e) => setFormData({ ...formData, maxStock: parseInt(e.target.value) || 0 })}
                    className="w-full border border-psr-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-psr-red"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-psr-textSecondary block mb-1">Unit</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full border border-psr-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-psr-red"
                  />
                </div>
              </div>
              <div className="pt-4 border-t border-psr-border flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-psr-border text-sm rounded-lg hover:bg-psr-bg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-psr-red hover:bg-psr-darkRed text-white text-sm font-semibold rounded-lg shadow-sm"
                >
                  {isSubmitting ? 'Registering...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
