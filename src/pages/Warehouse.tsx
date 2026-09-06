import React, { useState, useEffect } from 'react';
import { 
  Grid, 
  Eye, 
  CheckCircle, 
  X, 
  Box, 
  Info, 
  Warehouse as WarehouseIcon, 
  Layers, 
  RefreshCw,
  Package,
  MapPin,
  AlertCircle
} from 'lucide-react';
import axios from 'axios';

interface NormalizedLocationItem {
  id: string;
  name: string;
  sku: string;
  code: string;
  imageUrl: string;
  warehouseName: string;
  rackName: string;
  shelfNumber: string; // e.g. "Shelf 1"
  positionName: string; // e.g. "Pos 1"
  quantity: number;
  status: string;
}

export default function Warehouse() {
  const [items, setItems] = useState<NormalizedLocationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWarehouse, setSelectedWarehouse] = useState('Main Warehouse A');
  const [selectedRack, setSelectedRack] = useState('Rack A');
  const [selectedCell, setSelectedCell] = useState<{
    shelf: number;
    pos: number;
    items: NormalizedLocationItem[];
  } | null>(null);

  const shelves = [1, 2, 3, 4, 5];
  const positions = [1, 2, 3, 4];
  const defaultRacks = ['Rack A', 'Rack B', 'Rack C', 'Rack D', 'Rack P', 'Rack S'];

  const fetchWarehouseData = async () => {
    try {
      // 1. Try fetching from /api/products
      const response = await axios.get('/api/products');
      if (Array.isArray(response.data) && response.data.length > 0) {
        const normalized = parseProductsToLocations(response.data);
        setItems(normalized);
        return;
      }
      
      // 2. Fallback to /api/inventory
      const invResponse = await axios.get('/api/inventory');
      if (Array.isArray(invResponse.data) && invResponse.data.length > 0) {
        const normalized = parseInventoryToLocations(invResponse.data);
        setItems(normalized);
      }
    } catch (err) {
      console.error('Failed to fetch warehouse location data', err);
      // Fallback
      try {
        const invResponse = await axios.get('/api/inventory');
        if (Array.isArray(invResponse.data)) {
          setItems(parseInventoryToLocations(invResponse.data));
        }
      } catch (e) {
        console.error('Inventory fallback also failed', e);
      }
    } finally {
      setIsLoading(false);
    }
  };

  function parseProductsToLocations(products: any[]): NormalizedLocationItem[] {
    const list: NormalizedLocationItem[] = [];
    products.forEach((prod, index) => {
      const imgUrl = (Array.isArray(prod.images) && prod.images[0]) || prod.imageUrl || '/images/inventory/IMG_3086.jpg';

      if (Array.isArray(prod.stockLocations) && prod.stockLocations.length > 0) {
        prod.stockLocations.forEach((loc: any) => {
          list.push({
            id: prod.id,
            name: prod.name,
            sku: prod.sku,
            code: prod.code || prod.sku,
            imageUrl: imgUrl,
            warehouseName: loc.warehouse?.name || 'Main Warehouse A',
            rackName: loc.rack?.name || 'Rack A',
            shelfNumber: loc.shelfNumber || 'Shelf 1',
            positionName: loc.position?.name || 'Pos 1',
            quantity: loc.quantity !== undefined ? loc.quantity : (prod.currentStock || 0),
            status: prod.status || 'AVAILABLE'
          });
        });
      } else {
        // Distribute items gracefully across default racks if stockLocations is empty
        const rackIndex = index % defaultRacks.length;
        const shelfIndex = (index % shelves.length) + 1;
        const posIndex = (index % positions.length) + 1;

        list.push({
          id: prod.id,
          name: prod.name,
          sku: prod.sku,
          code: prod.code || prod.sku,
          imageUrl: imgUrl,
          warehouseName: 'Main Warehouse A',
          rackName: defaultRacks[rackIndex],
          shelfNumber: `Shelf ${shelfIndex}`,
          positionName: `Pos ${posIndex}`,
          quantity: prod.currentStock || 0,
          status: prod.status || 'AVAILABLE'
        });
      }
    });
    return list;
  }

  function parseInventoryToLocations(inventory: any[]): NormalizedLocationItem[] {
    return inventory.map((item, index) => {
      const imgUrl = (Array.isArray(item.images) && item.images[0]) || item.imageUrl || '/images/inventory/IMG_3086.jpg';
      const whName = (typeof item.warehouse === 'object' ? item.warehouse?.name : item.warehouse) || 'Main Warehouse A';
      const rName = (typeof item.rack === 'object' ? item.rack?.name : item.rack) || defaultRacks[index % defaultRacks.length];
      const posName = (typeof item.position === 'object' ? item.position?.name : item.rackPosition) || `Pos ${(index % 4) + 1}`;
      const shNumber = item.shelfNumber || `Shelf ${(index % 5) + 1}`;

      return {
        id: item.id || `inv-${index}`,
        name: item.name,
        sku: item.sku,
        code: item.productCode || item.code || item.sku,
        imageUrl: imgUrl,
        warehouseName: whName,
        rackName: rName,
        shelfNumber: shNumber,
        positionName: posName,
        quantity: item.currentStock || item.quantity || 0,
        status: item.status || 'AVAILABLE'
      };
    });
  }

  useEffect(() => {
    fetchWarehouseData();
  }, []);

  const uniqueWarehouses = Array.from(new Set(items.map(i => i.warehouseName))).filter(Boolean);
  if (uniqueWarehouses.length === 0) uniqueWarehouses.push('Main Warehouse A');

  // Stats
  const totalStockInView = items
    .filter(i => (!selectedWarehouse || i.warehouseName === selectedWarehouse) && (!selectedRack || i.rackName === selectedRack))
    .reduce((acc, curr) => acc + curr.quantity, 0);

  return (
    <div className="space-y-6">
      {/* Top Filter and Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 bg-white border border-psr-border p-5 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-psr-textPrimary">Physical Warehouse 3D Density Grid</h2>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Grid Active
            </span>
          </div>
          <p className="text-xs text-psr-textSecondary mt-1">
            Visual position mapping for shelves, slots, pallet density, and product locations.
          </p>
        </div>
        
        {/* Selector Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Warehouse Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-psr-textSecondary">Warehouse:</span>
            <select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="bg-white border border-psr-border rounded-xl px-3 py-2 text-xs font-semibold text-psr-textPrimary focus:outline-none focus:border-psr-red"
            >
              {uniqueWarehouses.map((wh) => (
                <option key={wh} value={wh}>{wh}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => { setIsLoading(true); fetchWarehouseData(); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-psr-border bg-white text-xs font-semibold text-psr-textSecondary hover:bg-psr-bg hover:text-psr-textPrimary transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* Rack Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs font-bold text-psr-textSecondary shrink-0 mr-1 flex items-center gap-1">
          <Layers className="w-4 h-4 text-psr-red" /> Select Rack:
        </span>
        {defaultRacks.map((rack) => {
          const rackItemCount = items.filter(i => 
            (!selectedWarehouse || i.warehouseName === selectedWarehouse) && 
            i.rackName.toLowerCase() === rack.toLowerCase()
          ).length;

          return (
            <button
              key={rack}
              onClick={() => setSelectedRack(rack)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                selectedRack === rack 
                  ? 'bg-psr-red text-white shadow-md shadow-psr-red/20' 
                  : 'bg-white border border-psr-border text-psr-textSecondary hover:text-psr-textPrimary hover:bg-psr-bg'
              }`}
            >
              <span>{rack}</span>
              {rackItemCount > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  selectedRack === rack ? 'bg-white/20 text-white' : 'bg-psr-bg text-psr-textSecondary'
                }`}>
                  {rackItemCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Shelf Position Grid Visualization */}
      <div className="bg-white border border-psr-border rounded-2xl p-6 shadow-xs">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-psr-border">
          <h3 className="font-heading font-bold text-base flex items-center gap-2 text-psr-textPrimary">
            <Grid className="w-5 h-5 text-psr-red" /> 
            {selectedWarehouse} &mdash; <span className="text-psr-red font-bold">{selectedRack}</span>
          </h3>
          <span className="text-xs font-bold text-psr-textSecondary bg-psr-bg px-3 py-1.5 rounded-lg border border-psr-border">
            Total Units in {selectedRack}: <span className="text-psr-textPrimary font-mono font-bold">{totalStockInView}</span>
          </span>
        </div>
        
        {isLoading ? (
          <div className="text-center py-20 text-sm text-psr-textSecondary animate-pulse flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-psr-red" />
            Loading Warehouse Visualizer Grid...
          </div>
        ) : (
          <div className="space-y-4">
            {shelves.map((shelf) => (
              <div key={shelf} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-2 rounded-xl hover:bg-psr-bg/20 transition-colors">
                {/* Shelf label */}
                <div className="w-24 shrink-0 flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-psr-red" />
                  <span className="text-xs font-bold text-psr-textPrimary font-heading uppercase tracking-wide">
                    Shelf {shelf}
                  </span>
                </div>
                
                {/* Position Blocks (4 positions per shelf) */}
                <div className="flex-1 w-full grid grid-cols-2 md:grid-cols-4 gap-3">
                  {positions.map((pos) => {
                    // Match items in cell (case-insensitive and format resilient)
                    const itemsInCell = items.filter(item => {
                      const matchWh = !selectedWarehouse || item.warehouseName.toLowerCase() === selectedWarehouse.toLowerCase();
                      const matchRack = item.rackName.toLowerCase() === selectedRack.toLowerCase();
                      const matchShelf = item.shelfNumber.toLowerCase().includes(`${shelf}`);
                      const matchPos = item.positionName.toLowerCase().includes(`${pos}`);
                      return matchWh && matchRack && matchShelf && matchPos;
                    });

                    const hasItems = itemsInCell.length > 0;
                    const totalQty = itemsInCell.reduce((sum, item) => sum + item.quantity, 0);

                    return (
                      <div
                        key={pos}
                        onClick={() => hasItems && setSelectedCell({ shelf, pos, items: itemsInCell })}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between min-h-[90px] ${
                          hasItems
                            ? 'bg-emerald-50/70 border-emerald-300 hover:border-emerald-500 hover:shadow-md'
                            : 'bg-psr-bg/40 border-psr-border/60 hover:border-psr-border border-dashed'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <span className="text-[11px] font-bold font-mono text-psr-textSecondary">
                            Pos {pos}
                          </span>
                          {hasItems ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                              {totalQty} pcs
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-psr-textSecondary">Empty</span>
                          )}
                        </div>

                        {hasItems ? (
                          <div className="mt-2 flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg border border-emerald-300 overflow-hidden bg-white shrink-0">
                              <img
                                src={itemsInCell[0].imageUrl}
                                alt={itemsInCell[0].name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-bold text-psr-textPrimary truncate" title={itemsInCell[0].name}>
                                {itemsInCell[0].name}
                              </div>
                              <div className="text-[10px] text-psr-textSecondary font-mono truncate">
                                {itemsInCell[0].sku}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-2 text-[11px] text-psr-textSecondary/60 italic">
                            Available Slot
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected Cell Modal */}
      {selectedCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-psr-border animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-psr-border flex justify-between items-center bg-psr-bg">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-psr-red text-white flex items-center justify-center">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-psr-textPrimary">
                    {selectedRack} &mdash; Shelf {selectedCell.shelf}, Pos {selectedCell.pos}
                  </h3>
                  <p className="text-[11px] text-psr-textSecondary">{selectedWarehouse}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedCell(null)} 
                className="text-psr-textSecondary hover:text-psr-red text-sm font-bold p-1 cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <h4 className="text-xs font-bold uppercase tracking-wider text-psr-textSecondary">
                Stored Items ({selectedCell.items.length})
              </h4>

              <div className="space-y-3">
                {selectedCell.items.map((item, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-psr-border bg-psr-bg/30 flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl border border-psr-border overflow-hidden bg-white shrink-0">
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?q=80&w=150';
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="font-bold text-sm text-psr-textPrimary truncate">{item.name}</h5>
                      <div className="text-xs text-psr-textSecondary font-mono mt-0.5">SKU: {item.sku}</div>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                          Quantity: {item.quantity} units
                        </span>
                        <span className="text-[11px] text-psr-textSecondary font-semibold">
                          Code: {item.code}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-psr-border bg-psr-bg/50 flex justify-end">
              <button
                onClick={() => setSelectedCell(null)}
                className="px-5 py-2 rounded-xl bg-psr-red hover:bg-psr-darkRed text-white text-xs font-bold shadow-sm cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}