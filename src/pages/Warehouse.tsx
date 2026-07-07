import React, { useState } from 'react';
import { Grid, Eye, CheckCircle } from 'lucide-react';
export default function Warehouse() {
  const [selectedRack, setSelectedRack] = useState('Rack A');
  const racks = ['Rack A', 'Rack B', 'Rack C', 'Rack D'];
  // Grid layout mock
  const shelves = [1, 2, 3, 4, 5];
  const positions = [1, 2, 3, 4];
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white border border-psr-border p-5 rounded-xl shadow-sm">
        <div>
          <h2 className="font-heading font-semibold text-lg">Physical Warehouse Visualizer</h2>
          <p className="text-xs text-psr-textSecondary">Select a Rack to examine capacity layout and shelfs.</p>
        </div>
        {/* Selector tab buttons */}
        <div className="flex bg-psr-bg p-1 rounded-lg border border-psr-border">
          {racks.map((rack) => (
            <button
              key={rack}
              onClick={() => setSelectedRack(rack)}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
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
      {/* Shelf Position Grid Visualization */}
      <div className="bg-white border border-psr-border rounded-xl p-6 shadow-sm">
        <h3 className="font-heading font-semibold text-base mb-6 flex items-center gap-2">
          <Grid className="w-5 h-5 text-psr-red" /> {selectedRack} Grid Density Model
        </h3>
        <div className="space-y-4">
          {shelves.map((shelf) => (
            <div key={shelf} className="flex items-center gap-4">
              {/* Shelf label */}
              <span className="w-20 text-xs font-semibold text-psr-textSecondary">Shelf {shelf}</span>
              {/* Position Blocks */}
              <div className="flex-1 grid grid-cols-4 gap-4">
                {positions.map((pos) => {
                  // Randomly assign occupancy rates for visuals
                  const occupancy = (shelf * pos * 17) % 100;
                  const isFull = occupancy > 85;
                  const isEmpty = occupancy < 20;
                  return (
                    <div 
                      key={pos} 
                      className={`p-4 rounded-lg border text-center transition-all ${
                        isFull 
                          ? 'bg-red-50/70 border-psr-red/35 text-psr-red' 
                          : isEmpty 
                          ? 'bg-psr-bg/40 border-psr-border text-psr-textSecondary' 
                          : 'bg-green-50/40 border-green-200 text-psr-success'
                      }`}
                    >
                      <span className="text-xs font-bold block">Pos {pos}</span>
                      <span className="text-[10px] uppercase font-semibold mt-1 block">
                        {isFull ? 'Critical' : isEmpty ? 'Empty' : 'Optimal'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        {/* Legend */}
        <div className="flex justify-end gap-6 mt-8 pt-6 border-t border-psr-border text-xs text-psr-textSecondary">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-red-100 border border-psr-red/30 rounded"></span> Empty / Depleted
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-green-50 border border-green-200 rounded"></span> Standard Occupied
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-psr-bg border border-psr-border rounded"></span> Empty Slots
          </div>
        </div>
      </div>
    </div>
  );
}