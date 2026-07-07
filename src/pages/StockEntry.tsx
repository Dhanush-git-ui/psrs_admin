import React, { useState, useRef } from 'react';
import { Upload, FileText, ArrowRight, CheckCircle, Camera } from 'lucide-react'; // 1. Added Camera icon
import axios from 'axios';

export default function StockEntry() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState<any>(null);
  
  // Ref for triggering camera capture
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Form Fields
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [quantity, setQuantity] = useState(1);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
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
      }
    } catch (err) {
      console.error(err);
      alert('OCR invoice processing failed. Please enter details manually.');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Upload Zone & Scanner */}
      <div className="lg:col-span-1 bg-white border border-psr-border rounded-xl p-6 shadow-sm space-y-4">
        <h3 className="font-heading font-semibold text-base pb-3 border-b border-psr-border">Invoice OCR Scanner</h3>

        {/* Drag & drop mock layout */}
        <div className="border-2 border-dashed border-psr-border hover:border-psr-red rounded-xl p-6 text-center cursor-pointer transition-colors relative">
          <input
            type="file"
            onChange={handleFileChange}
            className="absolute inset-0 opacity-0 cursor-pointer"
            accept="image/*,application/pdf"
          />
          <Upload className="w-8 h-8 text-psr-textSecondary mx-auto mb-2" />
          <span className="text-xs font-semibold block text-psr-textPrimary">
            {selectedFile ? selectedFile.name : 'Click to upload invoice / image'}
          </span>
          <span className="text-[10px] text-psr-textSecondary mt-1 block">Supports PDF, PNG, JPG</span>
        </div>

        {/* Hidden Camera Input */}
        <input
          type="file"
          ref={cameraInputRef}
          onChange={handleFileChange}
          accept="image/*"
          capture="environment" // Forces native rear-facing camera on mobile
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

        <form className="mt-6 space-y-4">
          {/* Form fields same as before... */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-psr-textSecondary block mb-1">Invoice Number</label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full border border-psr-border rounded-lg px-3 py-2 text-sm focus:outline-none"
                placeholder="INV-2026-981"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-psr-textSecondary block mb-1">Supplier Name</label>
              <input
                type="text"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                className="w-full border border-psr-border rounded-lg px-3 py-2 text-sm focus:outline-none"
                placeholder="e.g. Atlas Copco Ltd."
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-psr-textSecondary block mb-1">Product Quantity</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="w-full border border-psr-border rounded-lg px-3 py-2 text-sm focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-psr-textSecondary block mb-1">Allocation Warehouse</label>
              <select className="w-full border border-psr-border rounded-lg px-3 py-2 text-sm focus:outline-none bg-white">
                <option>Warehouse A</option>
                <option>Warehouse B</option>
                <option>Warehouse C</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-psr-textSecondary block mb-1">Batch / Lot No</label>
              <input
                type="text"
                className="w-full border border-psr-border rounded-lg px-3 py-2 text-sm focus:outline-none"
                placeholder="BAT-998"
              />
            </div>
          </div>

          <div className="pt-6 border-t border-psr-border flex justify-end">
            <button
              type="button"
              className="px-6 py-2.5 rounded-lg bg-psr-red hover:bg-psr-darkRed text-white text-sm font-semibold shadow-sm transition-all"
            >
              Log Stock Arrival
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
