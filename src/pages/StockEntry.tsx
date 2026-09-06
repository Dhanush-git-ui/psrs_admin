import React, { useState, useRef, useEffect } from 'react';
import { Upload, ArrowRight, CheckCircle, Camera } from 'lucide-react';
import axios from 'axios';

export default function StockEntry() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState<any>(null);
  
  // Ref for triggering camera capture
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Form Fields
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [productName, setProductName] = useState('');
  const [warehouse, setWarehouse] = useState('Warehouse A');
  const [batchNumber, setBatchNumber] = useState('');

  // Products state for suggestions
  const [products, setProducts] = useState<any[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchProducts = async () => {
    try {
      const res = await axios.get('/api/products');
      if (Array.isArray(res.data) && res.data.length > 0) {
        setProducts(res.data);
      } else {
        const invRes = await axios.get('/api/inventory');
        if (Array.isArray(invRes.data) && invRes.data.length > 0) {
          setProducts(invRes.data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch products', err);
      try {
        const invRes = await axios.get('/api/inventory');
        if (Array.isArray(invRes.data) && invRes.data.length > 0) {
          setProducts(invRes.data);
        }
      } catch (e) {
        console.error('Fallback fetch also failed', e);
      }
    } finally {
      setIsLoadingProducts(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleScanInvoice = async () => {
    if (!selectedFile) return;
    setIsScanning(true);
    const formData = new FormData();
    formData.append('invoice', selectedFile);

    try {
      const response = await axios.post('/api/ocr/scan', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (response.data) {
        setScannedData(response.data);
        setInvoiceNumber(response.data.invoiceNumber || '');
        setSupplierName(response.data.supplierName || '');
        setQuantity(response.data.quantity || 1);
        
        // Fill product name returned by OCR
        if (response.data.productName) {
          setProductName(response.data.productName);
        }
      }
    } catch (err) {
      console.error(err);
      alert('OCR invoice processing failed. Please enter details manually.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleLogStockArrival = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim()) {
      alert('Please enter a product name or SKU.');
      return;
    }
    setIsSubmitting(true);
    try {
      const matched = products.find(
        (p) =>
          p.sku?.toLowerCase() === productName.trim().toLowerCase() ||
          p.name?.toLowerCase() === productName.trim().toLowerCase()
      );

      await axios.post('/api/products/adjust-stock', {
        sku: matched ? matched.sku : productName.trim(),
        productName: productName.trim(),
        name: productName.trim(),
        quantity,
        action: 'INBOUND',
        image: imagePreview || undefined,
        images: imagePreview ? [imagePreview] : undefined,
        warehouse,
        batchNumber: batchNumber || undefined,
        invoiceNumber: invoiceNumber || undefined,
        supplierName: supplierName || undefined,
        reason: `Inbound receipt${invoiceNumber ? ' (Inv #' + invoiceNumber + ')' : ''}${supplierName ? ' from ' + supplierName : ''}`
      });
      alert('Stock arrival logged successfully! Photo and stock levels updated.');
      // Reset form fields
      setProductName('');
      setInvoiceNumber('');
      setSupplierName('');
      setQuantity(1);
      setBatchNumber('');
      setSelectedFile(null);
      setImagePreview(null);
      setScannedData(null);
      fetchProducts();
    } catch (err: any) {
      console.error('Stock arrival error:', err);
      let errorMsg = 'Failed to log stock arrival.';
      if (err.response?.data) {
        const d = err.response.data;
        if (typeof d.error === 'string') {
          errorMsg = d.error;
        } else if (typeof d.error === 'object' && d.error !== null) {
          const msgs = Object.values(d.error).flat().filter(Boolean);
          errorMsg = msgs.join(', ') || JSON.stringify(d.error);
        } else if (typeof d.message === 'string') {
          errorMsg = d.message;
        }
      } else if (err.message) {
        errorMsg = err.message;
      }
      alert('Failed to log stock arrival: ' + errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Upload Zone & Scanner */}
      <div className="lg:col-span-1 bg-white border border-psr-border rounded-xl p-6 shadow-sm space-y-4">
        <h3 className="font-heading font-semibold text-base pb-3 border-b border-psr-border">Invoice OCR Scanner</h3>

        {/* Drag & drop file input */}
        <div className="border-2 border-dashed border-psr-border hover:border-psr-red rounded-xl p-4 text-center cursor-pointer transition-colors relative bg-psr-bg/40">
          <input
            type="file"
            onChange={handleFileChange}
            className="absolute inset-0 opacity-0 cursor-pointer z-10"
            accept="image/*,application/pdf"
          />
          {imagePreview ? (
            <div className="space-y-2">
              <img 
                src={imagePreview} 
                alt="Uploaded drill preview" 
                className="w-full h-36 object-contain rounded-lg border border-psr-border bg-white"
              />
              <span className="text-xs font-semibold block text-psr-textPrimary truncate">
                {selectedFile?.name || 'Photo selected'}
              </span>
              <span className="text-[10px] text-psr-red block">Click or drop to replace photo</span>
            </div>
          ) : (
            <div>
              <Upload className="w-8 h-8 text-psr-textSecondary mx-auto mb-2" />
              <span className="text-xs font-semibold block text-psr-textPrimary">
                {selectedFile ? selectedFile.name : 'Click to upload drill photo / invoice'}
              </span>
              <span className="text-[10px] text-psr-textSecondary mt-1 block">Supports PNG, JPG, JPEG, PDF</span>
            </div>
          )}
        </div>

        {/* Hidden Camera Input */}
        <input
          type="file"
          ref={cameraInputRef}
          onChange={handleFileChange}
          accept="image/*"
          capture="environment"
          className="hidden"
        />

        {/* Camera Trigger Button */}
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          className="w-full py-2.5 rounded-lg border border-psr-border bg-white text-psr-textPrimary hover:bg-psr-lightRed hover:text-psr-red text-sm font-semibold shadow-sm transition-all flex items-center justify-center gap-2 hover-lift"
        >
          <Camera className="w-4 h-4 text-psr-red" />
          Take Photo via Camera
        </button>

        {selectedFile && (
          <button
            onClick={handleScanInvoice}
            disabled={isScanning}
            className="w-full py-2.5 rounded-lg bg-psr-red hover:bg-psr-darkRed text-white text-sm font-semibold shadow-sm transition-all flex items-center justify-center gap-2"
          >
            {isScanning ? (
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
            ) : (
              <>Scan Invoice Details <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        )}

        {scannedData && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-2">
            <span className="text-xs font-bold text-psr-success flex items-center gap-1">
              <CheckCircle className="w-4 h-4" /> OCR Scan Successful
            </span>
            <pre className="text-[10px] text-psr-textSecondary overflow-x-auto">
              {JSON.stringify(scannedData, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Main Stock Entry logging form */}
      <div className="lg:col-span-2 bg-white border border-psr-border rounded-xl p-6 shadow-sm">
        <h3 className="font-heading font-semibold text-base pb-4 border-b border-psr-border">Inbound Receipt Registry</h3>

        <form onSubmit={handleLogStockArrival} className="mt-6 space-y-4">
          <div>
            <label className="text-xs font-bold text-psr-textSecondary block mb-1">Enter Product</label>
            <input
              required
              type="text"
              list="stock-entry-products-list"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="Enter product name or SKU (e.g. Diamond Core Drill Bit 50mm)"
              className="w-full border border-psr-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-psr-red bg-white font-medium"
            />
            <datalist id="stock-entry-products-list">
              {products.map((prod) => (
                <option key={prod.id || prod.sku} value={prod.name}>
                  {prod.sku ? `SKU: ${prod.sku}` : ''}
                </option>
              ))}
            </datalist>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-psr-textSecondary block mb-1">Invoice Number</label>
              <input
                required
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full border border-psr-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-psr-red"
                placeholder="INV-2026-981"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-psr-textSecondary block mb-1">Supplier Name</label>
              <input
                required
                type="text"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                className="w-full border border-psr-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-psr-red"
                placeholder="e.g. Atlas Copco Ltd."
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-psr-textSecondary block mb-1">Product Quantity</label>
              <input
                required
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="w-full border border-psr-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-psr-red"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-psr-textSecondary block mb-1">Allocation Warehouse</label>
              <select 
                value={warehouse}
                onChange={(e) => setWarehouse(e.target.value)}
                className="w-full border border-psr-border rounded-lg px-3 py-2 text-sm focus:outline-none bg-white focus:border-psr-red"
              >
                <option value="Warehouse A">Warehouse A</option>
                <option value="Warehouse B">Warehouse B</option>
                <option value="Warehouse C">Warehouse C</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-psr-textSecondary block mb-1">Batch / Lot No</label>
              <input
                type="text"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                className="w-full border border-psr-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-psr-red"
                placeholder="BAT-998"
              />
            </div>
          </div>

          <div className="pt-6 border-t border-psr-border flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-lg bg-psr-red hover:bg-psr-darkRed text-white text-sm font-semibold shadow-sm transition-all"
            >
              {isSubmitting ? 'Logging...' : 'Log Stock Arrival'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
