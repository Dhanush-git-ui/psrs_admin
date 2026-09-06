import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  ArrowUpDown, 
  Trash2, 
  RefreshCw, 
  Upload, 
  Image as ImageIcon, 
  Link as LinkIcon, 
  Camera, 
  CheckCircle2, 
  Globe, 
  Sparkles,
  Layers,
  Search,
  ExternalLink
} from 'lucide-react';
import axios from 'axios';

const DEFAULT_CATEGORIES = [
  'Drilling Rigs & Machinery',
  'Rotation Motors',
  'Crankcase',
  'Piston Assembly',
  'Valves',
  'Bearings & Seals',
  'Fasteners',
  'Air System',
  'Drilling Tools & Bits',
  'Drill Accessories'
];

export default function Products() {
  const [showModal, setShowModal] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Image Upload States
  const [imageSource, setImageSource] = useState<'upload' | 'url'>('upload');
  const [previewImage, setPreviewImage] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    sku: '',
    category: 'Drilling Rigs & Machinery',
    categoryId: '',
    description: '',
    material: 'Hardened High-Grade Industrial Steel',
    weight: 0,
    dimensions: '',
    unit: 'pcs',
    minStock: 10,
    maxStock: 1000,
    currentStock: 1,
    costPrice: 0,
    sellingPrice: 0,
    imageUrl: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchProducts = async () => {
    try {
      const response = await axios.get('/api/products');
      if (Array.isArray(response.data)) {
        setProducts(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch products', err);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/api/categories');
      if (Array.isArray(response.data) && response.data.length > 0) {
        setCategories(response.data);
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

  // Handle local image file selection and convert to Base64
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 15 * 1024 * 1024) {
        alert('File is too large. Please select an image under 15MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setPreviewImage(base64String);
        setFormData(prev => ({ ...prev, imageUrl: base64String }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUrlChange = (url: string) => {
    setPreviewImage(url);
    setFormData(prev => ({ ...prev, imageUrl: url }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      sku: '',
      category: 'Drilling Rigs & Machinery',
      categoryId: categories[0]?.id || '',
      description: '',
      material: 'Hardened High-Grade Industrial Steel',
      weight: 0,
      dimensions: '',
      unit: 'pcs',
      minStock: 10,
      maxStock: 1000,
      currentStock: 1,
      costPrice: 0,
      sellingPrice: 0,
      imageUrl: '',
    });
    setPreviewImage('');
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"? This will immediately remove it from https://drills-dun.vercel.app as well.`)) {
      return;
    }

    setDeletingId(id);
    try {
      await axios.delete(`/api/products/${id}`);
      setProducts((prev) => prev.filter((p) => p.id !== id && p.sku !== id));
      alert(`Product "${name}" deleted successfully and synced to live website.`);
    } catch (err: any) {
      console.error('Failed to delete product', err);
      alert('Failed to delete product: ' + (err.response?.data?.error || err.message));
    } finally {
      setDeletingId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Please enter a product name');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        sku: formData.sku.trim() || ('PSR-' + formData.name.toUpperCase().replace(/[^A-Z0-9]/g, '-').slice(0, 8) + '-' + Math.floor(100 + Math.random() * 900)),
        code: formData.code.trim() || ('COD-' + (formData.sku || formData.name).toUpperCase().replace(/[^A-Z0-9]/g, '-').slice(0, 8)),
        images: formData.imageUrl ? [formData.imageUrl] : ['/images/inventory/IMG_3086.jpg']
      };

      await axios.post('/api/products', payload);
      setShowModal(false);
      resetForm();
      alert('🎉 Product & Image created successfully! Changes are instantly synchronized to https://drills-dun.vercel.app');
      fetchProducts();
    } catch (err: any) {
      console.error(err);
      alert('Failed to register product: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter products by search & category
  const filteredProducts = products.filter(p => {
    const catName = p.category?.name || p.category || '';
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || catName.toLowerCase() === categoryFilter.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-psr-border shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-psr-textPrimary">Products Specification Database</h2>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Sync Active
            </span>
          </div>
          <p className="text-xs text-psr-textSecondary mt-1">
            Manage product dimensions, technical specs, uploaded images, and real-time syncing to{' '}
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
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setIsLoading(true); fetchProducts().finally(() => setIsLoading(false)); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-psr-border bg-white text-xs font-semibold text-psr-textSecondary hover:bg-psr-bg hover:text-psr-textPrimary transition-all cursor-pointer"
            title="Refresh database"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-psr-red hover:bg-psr-darkRed text-white text-sm font-semibold shadow-md shadow-psr-red/20 transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" /> Add New Product
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-psr-textSecondary" />
          <input
            type="text"
            placeholder="Search products by name, SKU, or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-psr-border rounded-xl text-sm focus:outline-none focus:border-psr-red focus:ring-1 focus:ring-psr-red"
          />
        </div>
        
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-full sm:w-auto px-4 py-2.5 bg-white border border-psr-border rounded-xl text-sm focus:outline-none focus:border-psr-red"
        >
          <option value="all">All Categories ({products.length})</option>
          {DEFAULT_CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Products Master table */}
      <div className="bg-white border border-psr-border rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-16 text-center text-sm text-psr-textSecondary animate-pulse flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-psr-red" />
              Loading product specification database...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-16 text-center text-sm text-psr-textSecondary flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-psr-bg flex items-center justify-center text-psr-textSecondary">
                <Layers className="w-6 h-6" />
              </div>
              <p className="font-semibold text-psr-textPrimary">No products found matching your search</p>
              <p className="text-xs text-psr-textSecondary">Click "Add New Product" to create your first product.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-psr-bg/60 text-xs font-semibold text-psr-textSecondary border-b border-psr-border">
                  <th className="px-5 py-3.5">Image & Name</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Code / SKU</th>
                  <th className="px-5 py-3.5">Material & Specs</th>
                  <th className="px-5 py-3.5 text-center">Stock</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-psr-border text-sm">
                {filteredProducts.map((prod, idx) => {
                  const imgUrl = (prod.images && prod.images[0]) || prod.imageUrl || '/images/inventory/IMG_3086.jpg';
                  const catName = prod.category?.name || prod.category || 'General';
                  const isAvailable = (prod.currentStock || 0) > 0;

                  return (
                    <tr key={prod.id || idx} className="hover:bg-psr-bg/40 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-brand-softwhite border border-psr-border flex items-center justify-center overflow-hidden shrink-0">
                            <img
                              src={imgUrl}
                              alt={prod.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?q=80&w=150';
                              }}
                            />
                          </div>
                          <div>
                            <div className="font-semibold text-psr-textPrimary leading-snug">{prod.name}</div>
                            {prod.description && (
                              <div className="text-xs text-psr-textSecondary line-clamp-1 mt-0.5">{prod.description}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="px-2.5 py-1 rounded-lg bg-psr-bg border border-psr-border/70 text-xs font-semibold text-psr-textPrimary">
                          {catName}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs font-mono">
                        <div className="font-semibold text-psr-textPrimary">{prod.sku}</div>
                        <div className="text-psr-textSecondary">{prod.code}</div>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-psr-textSecondary">
                        <div>{prod.material || 'Hardened Steel'}</div>
                        {prod.weight ? <div>{prod.weight} kg</div> : null}
                      </td>
                      <td className="px-5 py-3.5 text-center font-mono font-bold text-psr-textPrimary">
                        {prod.currentStock ?? 0} {prod.unit || 'pcs'}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                          isAvailable 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isAvailable ? 'bg-emerald-500' : 'bg-red-500'}`} />
                          {isAvailable ? 'In Stock' : 'Out of Stock'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => handleDeleteProduct(prod.id, prod.name)}
                          disabled={deletingId === prod.id}
                          className="p-2 rounded-xl text-psr-textSecondary hover:text-psr-red hover:bg-psr-lightRed transition-all cursor-pointer"
                          title="Delete product from admin & live site"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add Product Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-psr-border my-8">
            <div className="px-6 py-4 border-b border-psr-border flex justify-between items-center bg-psr-bg">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-psr-red text-white flex items-center justify-center font-bold text-sm">
                  +
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-psr-textPrimary">Add Product & Image</h3>
                  <p className="text-[11px] text-psr-textSecondary">Syncs immediately with drills-dun.vercel.app</p>
                </div>
              </div>
              <button 
                onClick={() => setShowModal(false)} 
                className="text-psr-textSecondary hover:text-psr-red text-sm font-semibold p-1 cursor-pointer"
              >
                ✕ Cancel
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* Image Upload Box */}
              <div className="bg-psr-bg/50 border-2 border-dashed border-psr-border hover:border-psr-red/50 rounded-2xl p-4 transition-colors">
                <label className="text-xs font-bold text-psr-textPrimary block mb-2 flex items-center justify-between">
                  <span>Product Image</span>
                  <div className="flex items-center gap-2 font-normal">
                    <button
                      type="button"
                      onClick={() => setImageSource('upload')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                        imageSource === 'upload' ? 'bg-psr-red text-white' : 'bg-white text-psr-textSecondary'
                      }`}
                    >
                      <Upload className="w-3 h-3 inline mr-1" /> Upload File
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageSource('url')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                        imageSource === 'url' ? 'bg-psr-red text-white' : 'bg-white text-psr-textSecondary'
                      }`}
                    >
                      <LinkIcon className="w-3 h-3 inline mr-1" /> Image URL
                    </button>
                  </div>
                </label>

                {imageSource === 'upload' ? (
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    {previewImage ? (
                      <div className="relative w-28 h-28 rounded-xl border border-psr-border overflow-hidden shrink-0 bg-white">
                        <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => { setPreviewImage(''); setFormData(p => ({ ...p, imageUrl: '' })); }}
                          className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-1 hover:bg-psr-red"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-28 h-28 rounded-xl border border-dashed border-psr-border bg-white flex flex-col items-center justify-center text-psr-textSecondary hover:text-psr-red hover:border-psr-red cursor-pointer shrink-0"
                      >
                        <ImageIcon className="w-8 h-8 mb-1" />
                        <span className="text-[10px] font-semibold">Upload Photo</span>
                      </div>
                    )}

                    <div className="flex-1 text-center sm:text-left space-y-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <input
                        ref={cameraInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3 py-1.5 rounded-lg border border-psr-border bg-white text-xs font-semibold text-psr-textPrimary hover:border-psr-red cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <Upload className="w-3.5 h-3.5" /> Choose Image from Device
                        </button>
                        <button
                          type="button"
                          onClick={() => cameraInputRef.current?.click()}
                          className="px-3 py-1.5 rounded-lg border border-psr-border bg-white text-xs font-semibold text-psr-textPrimary hover:border-psr-red cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <Camera className="w-3.5 h-3.5" /> Capture Photo
                        </button>
                      </div>
                      <p className="text-[11px] text-psr-textSecondary">
                        Supported formats: PNG, JPG, WEBP, SVG. High-resolution images will be synchronized automatically.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <input
                      type="url"
                      value={formData.imageUrl}
                      onChange={(e) => handleUrlChange(e.target.value)}
                      placeholder="https://example.com/drills/rock-drill.jpg"
                      className="w-full border border-psr-border rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-psr-red"
                    />
                    {previewImage && (
                      <div className="w-24 h-24 rounded-xl border border-psr-border overflow-hidden bg-white">
                        <img src={previewImage} alt="URL Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Basic Details */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-psr-textSecondary block mb-1">Product Name *</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border border-psr-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-psr-red"
                    placeholder="e.g. PSR-H700 Deep Borehole Drill Rig"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-psr-textSecondary block mb-1">Category *</label>
                    <select
                      required
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full border border-psr-border rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:border-psr-red font-medium"
                    >
                      {DEFAULT_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-psr-textSecondary block mb-1">Custom SKU / Code</label>
                    <input
                      type="text"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      className="w-full border border-psr-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-psr-red"
                      placeholder="Leave blank for auto-generated SKU"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-psr-textSecondary block mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full border border-psr-border rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-psr-red"
                    placeholder="Brief description for customer catalog page..."
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-bold text-psr-textSecondary block mb-1">Material</label>
                    <input
                      type="text"
                      value={formData.material}
                      onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                      className="w-full border border-psr-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-psr-red"
                      placeholder="Forged Alloy Steel"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-psr-textSecondary block mb-1">Weight (kg)</label>
                    <input
                      type="number"
                      value={formData.weight || ''}
                      onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) || 0 })}
                      className="w-full border border-psr-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-psr-red"
                      placeholder="e.g. 52.5"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-psr-textSecondary block mb-1">Dimensions</label>
                    <input
                      type="text"
                      value={formData.dimensions}
                      onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
                      className="w-full border border-psr-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-psr-red"
                      placeholder="e.g. 700x350x280mm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-bold text-psr-textSecondary block mb-1">Initial Stock</label>
                    <input
                      type="number"
                      value={formData.currentStock}
                      onChange={(e) => setFormData({ ...formData, currentStock: parseInt(e.target.value) || 0 })}
                      className="w-full border border-psr-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-psr-red font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-psr-textSecondary block mb-1">Min Level</label>
                    <input
                      type="number"
                      value={formData.minStock}
                      onChange={(e) => setFormData({ ...formData, minStock: parseInt(e.target.value) || 0 })}
                      className="w-full border border-psr-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-psr-red"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-psr-textSecondary block mb-1">Unit</label>
                    <input
                      type="text"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="w-full border border-psr-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-psr-red"
                      placeholder="pcs, sets, units"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-psr-border flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  Live Sync to drills-dun.vercel.app
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2.5 border border-psr-border text-sm rounded-xl hover:bg-psr-bg font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-psr-red hover:bg-psr-darkRed text-white text-sm font-bold rounded-xl shadow-md shadow-psr-red/20 cursor-pointer disabled:opacity-50 active:scale-95"
                  >
                    {isSubmitting ? 'Syncing to Catalog...' : 'Save & Publish Product'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
