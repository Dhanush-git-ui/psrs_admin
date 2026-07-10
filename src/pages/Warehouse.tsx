import React, { useState, useEffect } from 'react';
import { Grid, Eye, CheckCircle, X, Box, Info } from 'lucide-react';
import axios from 'axios';

interface InventoryItem {
  id: string;
  productId: string;
  warehouseId: string;
  rackId: string;
  positionId: string;
  shelfNumber: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    sku: string;
    code: string;
    images: string[];
    status: string;
    currentStock: number;
    minStock: number;
  };
  warehouse: {
    id: string;
    name: string;
  };
  rack: {
    id: string;
    name: string;
  };
  position: {
    id: string;
    name: string;
  };
}

export default function Warehouse() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [selectedRack, setSelectedRack] = useState('Rack A');
  const [selectedCell, setSelectedCell] = useState<{
    shelf: number;
    pos: number;
    items: InventoryItem[];
  } | null>(null);

  const shelves = [1, 2, 3, 4, 5];
  const positions = [1, 2, 3, 4];

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const response = await axios.get('/api/inventory');
        setInventory(response.data);
        
        // Default selected warehouse if available
        const warehouses = Array.from(new Set(response.data.map((item: any) => item.warehouse.name))) as string[];
        if (warehouses.length > 0) {
          setSelectedWarehouse(prev => prev || (warehouses.includes('Main Warehouse A') ? 'Main Warehouse A' : warehouses[0]));
        }
      } catch (err) {
        console.error('Failed to fetch inventory', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInventory();
  }, []);

  const uniqueWarehouses = Array.from(new Set(inventory.map(item => item.warehouse.name))) as string[];
  const racks = ['Rack A', 'Rack B', 'Rack C', 'Rack D', 'Rack P', 'Rack S'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 bg-white border border-psr-border p-5 rounded-xl shadow-sm">
        <div className="flex-1">
          <h2 className="font-heading font-semibold text-lg">Physical Warehouse Visualizer</h2>
          <p className="text-xs text-psr-textSecondary">Select a Warehouse and Rack to examine capacity layout and shelves.</p>
        </div>
        
        {/* Selector Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Warehouse Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-psr-textSecondary">Warehouse:</span>
            <select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="bg-psr-bg border border-psr-border rounded-lg px-3 py-1.5 text-xs font-semibold text-psr-textPrimary focus:outline-none focus:ring-1 focus:ring-psr-red"
            >
              {uniqueWarehouses.map((wh) => (
                <option key={wh} value={wh}>{wh}</option>
              ))}
              {uniqueWarehouses.length === 0 && (
                <option value="">No Warehouses Found</option>
              )}
            </select>
          </div>

          {/* Selector tab buttons for Racks */}
          <div className="flex bg-psr-bg p-1 rounded-lg border border-psr-border">
            {racks.map((rack) => (
              <button
                key={rack}
                onClick={() => setSelectedRack(rack)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  selectedRack === rack 
                    ? 'bg-white text-psr-red shadow-sm' 
                    : 'text-psr-textSecondary hover:text-psr-textPrimary'
                }`}
              >
                {rack}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Shelf Position Grid Visualization */}
      <div className="bg-white border border-psr-border rounded-xl p-6 shadow-sm">
        <h3 className="font-heading font-semibold text-base mb-6 flex items-center gap-2">
          <Grid className="w-5 h-5 text-psr-red" /> {selectedWarehouse || 'Warehouse'} - {selectedRack} Grid Density Model
        </h3>
        
        {isLoading ? (
          <div className="text-center py-12 text-sm text-psr-textSecondary animate-pulse">Loading Grid Model...</div>
        ) : (
          <div className="space-y-4">
            {shelves.map((shelf) => (
              <div key={shelf} className="flex items-center gap-4">
                {/* Shelf label */}
                <span className="w-20 text-xs font-semibold text-psr-textSecondary">Shelf {shelf}</span>
                
                {/* Position Blocks */}
                <div className="flex-1 grid grid-cols-4 gap-4">
                  {positions.map((pos) => {
                    // Filter items matching current warehouse, rack, shelf and position
                    const itemsInCell = inventory.filter(item => 
                      item.warehouse.name === selectedWarehouse &&
                      item.rack.name === selectedRack &&
                      item.shelfNumber === `Shelf ${shelf}` &&
                      item.position.name === `Pos ${pos}`
                    );

                    const hasItems = itemsInCell.length > 0;
                    const totalQty = itemsInCell.reduce((sum, item) => sum + item.quantity, 0);
                    
                    // Simple threshold occupancy coloring:
                    // Empty = 0 quantity or items.
                    // Critical = > 80 units (or close to max capacity)
                    // Optimal = otherwise
                    const isEmpty = !hasItems;
                    const isFull = totalQty > 80;

                    const mainItem = itemsInCell[0];

                    return (
                      <div 
                        key={pos} 
                        onClick={() => setSelectedCell({ shelf, pos, items: itemsInCell })}
                        className={`p-3 rounded-lg border text-center transition-all cursor-pointer hover:shadow-md hover:scale-[1.02] flex flex-col justify-between min-h-[90px] ${
                          isFull 
                            ? 'bg-red-50/70 border-psr-red/35 text-psr-red' 
                            : isEmpty 
                            ? 'bg-psr-bg/40 border-psr-border text-psr-textSecondary' 
                            : 'bg-green-50/40 border-green-200 text-psr-success'
                        }`}
                      >
                        <div>
                          <span className="text-[10px] uppercase font-bold tracking-wider opacity-75">Pos {pos}</span>
                          <span className="text-xs font-bold block mt-1">
                            {isEmpty ? 'Empty' : isFull ? 'Critical' : 'Optimal'}
                          </span>
                        </div>

                        {/* Miniature content preview */}
                        {!isEmpty && (
                          <div className="mt-2 flex items-center justify-center gap-1.5 bg-white/70 rounded p-1 border border-psr-border/40">
                            {mainItem.product.images && mainItem.product.images.length > 0 && (
                              <img 
                                src={mainItem.product.images[0]} 
                                alt="" 
                                className="w-5 h-5 object-cover rounded border bg-white"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=50&q=80';
                                }}
                              />
                            )}
                            <span className="text-[9px] font-semibold truncate max-w-[80px]" title={mainItem.product.name}>
                              {itemsInCell.length > 1 ? `${itemsInCell.length} Items` : mainItem.product.name}
                            </span>
                            <span className="text-[9px] font-bold ml-auto">({totalQty})</span>
                          </div>
                        )}
                        {isEmpty && (
                          <span className="text-[9px] opacity-55 mt-2 italic block">Empty Slot</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Legend */}
        <div className="flex justify-end gap-6 mt-8 pt-6 border-t border-psr-border text-xs text-psr-textSecondary">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-red-50 border border-psr-red/30 rounded"></span> Critical (High Load)
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-green-50 border border-green-200 rounded"></span> Standard Occupied
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-psr-bg border border-psr-border rounded"></span> Empty Slots
          </div>
        </div>
      </div>

      {/* Selected Cell Modal */}
      {selectedCell && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-psr-border">
              <div>
                <h3 className="font-heading font-bold text-lg text-psr-textPrimary">Location Details</h3>
                <p className="text-xs text-psr-textSecondary mt-0.5">
                  {selectedWarehouse || 'Warehouse'} • {selectedRack} • Shelf {selectedCell.shelf} • Pos {selectedCell.pos}
                </p>
              </div>
              <button 
                onClick={() => setSelectedCell(null)}
                className="p-2 text-psr-textSecondary hover:text-psr-red hover:bg-psr-lightRed rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Content */}
            <div className="p-6 max-h-[50vh] overflow-y-auto space-y-4">
              {selectedCell.items.length === 0 ? (
                <div className="text-center py-10">
                  <Box className="w-12 h-12 text-psr-textSecondary/30 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-psr-textSecondary">No items are stored in this position.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-xs font-semibold text-psr-textSecondary uppercase tracking-wider">
                    Stored Products ({selectedCell.items.length})
                  </div>
                  {selectedCell.items.map((item) => {
                    const imageUrl = item.product.images && item.product.images.length > 0 
                      ? item.product.images[0] 
                      : 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=150&q=80';
                    return (
                      <div key={item.id} className="flex gap-4 p-4 border border-psr-border rounded-xl bg-psr-bg/25">
                        <img 
                          src={imageUrl} 
                          alt={item.product.name} 
                          className="w-16 h-16 object-cover rounded-lg border border-psr-border bg-white"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=150&q=80';
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <h4 className="font-semibold text-sm text-psr-textPrimary leading-snug">{item.product.name}</h4>
                              <p className="text-xs text-psr-textSecondary mt-0.5">SKU: {item.product.sku}</p>
                            </div>
                            <span className="text-xs font-bold text-psr-red bg-psr-lightRed px-2.5 py-0.5 rounded-full whitespace-nowrap">
                              Qty: {item.quantity}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 mt-3 text-xs text-psr-textSecondary border-t border-psr-border/40 pt-2">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                              item.product.status === 'AVAILABLE' 
                                ? 'bg-green-50 text-psr-success' 
                                : 'bg-red-50 text-psr-red'
                            }`}>
                              {item.product.status}
                            </span>
                            <span>•</span>
                            <span>Min Stock: {item.product.minStock}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="p-6 border-t border-psr-border flex justify-end bg-psr-bg/10">
              <button 
                onClick={() => setSelectedCell(null)}
                className="px-5 py-2 bg-psr-red hover:bg-psr-darkRed text-white font-semibold text-sm rounded-xl transition-all shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}