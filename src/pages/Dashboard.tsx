// client/src/pages/Dashboard.tsx
import React, { useState } from 'react';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  AlertTriangle, 
  CheckCircle2, 
  PackageCheck,
  TrendingUp
} from 'lucide-react';

export default function Dashboard() {
  // Mock Stats Data
  const stats = [
    { name: 'Total SKU Inventory', value: '1,248', desc: 'Active stock units', icon: PackageCheck, color: 'text-psr-red bg-psr-lightRed' },
    { name: 'Low Stock Warnings', value: '14', desc: 'Requires replenishment', icon: AlertTriangle, color: 'text-psr-warning bg-amber-50' },
    { name: 'Out of Stock Items', value: '3', desc: 'Critical supply delay', icon: ArrowDownRight, color: 'text-psr-danger bg-red-50' },
    { name: 'Inbound Deliveries (Today)', value: '8', desc: 'Successfully logged', icon: CheckCircle2, color: 'text-psr-success bg-green-50' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="p-6 rounded-2xl glass-panel relative overflow-hidden flex flex-col justify-center min-h-[140px] shadow-premium">
        <div className="z-10">
          <h2 className="text-2xl font-bold tracking-tight text-psr-textPrimary">Welcome back to PSR Control Center</h2>
          <p className="text-psr-textSecondary text-sm mt-1 max-w-lg">
            Monitor real-time warehouse activities, process incoming invoices, and run instant smart search queries.
          </p>
        </div>
        <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-10 pointer-events-none hidden lg:block">
          <TrendingUp className="w-32 h-32 text-psr-red" />
        </div>
      </div>

      {/* Grid of stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="p-5 bg-white rounded-xl border border-psr-border shadow-sm flex items-start justify-between">
              <div>
                <span className="text-xs font-medium text-psr-textSecondary uppercase tracking-wider">{stat.name}</span>
                <h3 className="text-2xl font-bold font-numbers mt-1.5">{stat.value}</h3>
                <span className="text-xs text-psr-textSecondary mt-0.5 block">{stat.desc}</span>
              </div>
              <div className={`p-2.5 rounded-lg ${stat.color}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Movements & Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-psr-border p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-psr-border">
            <h3 className="font-heading font-semibold text-lg">Recent Stock Movements</h3>
            <button className="text-xs font-semibold text-psr-red hover:underline flex items-center gap-1">
              View All <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-xs text-psr-textSecondary border-b border-psr-border">
                  <th className="pb-3 font-semibold">SKU / Code</th>
                  <th className="pb-3 font-semibold">Action</th>
                  <th className="pb-3 font-semibold">Warehouse</th>
                  <th className="pb-3 font-semibold">Qty</th>
                  <th className="pb-3 font-semibold">Timestamp</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-psr-border">
                {[
                  { sku: 'PSR-BT-029', action: 'INBOUND', warehouse: 'Warehouse A', qty: '+500', time: '10 mins ago', color: 'text-psr-success' },
                  { sku: 'PSR-RM-102', action: 'PROJECT ASSIGN', warehouse: 'Warehouse B', qty: '-30', time: '42 mins ago', color: 'text-psr-red' },
                  { sku: 'PSR-DS-451', action: 'DAMAGE LOG', warehouse: 'Warehouse A', qty: '-2', time: '2 hours ago', color: 'text-psr-danger' },
                  { sku: 'PSR-ST-992', action: 'INBOUND', warehouse: 'Warehouse C', qty: '+1,200', time: '5 hours ago', color: 'text-psr-success' },
                ].map((item, idx) => (
                  <tr key={idx} className="hover:bg-psr-bg transition-colors">
                    <td className="py-3 font-semibold">{item.sku}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.action.includes('INBOUND') ? 'bg-green-50 text-psr-success' : 'bg-red-50 text-psr-red'
                      }`}>{item.action}</span>
                    </td>
                    <td className="py-3 text-psr-textSecondary">{item.warehouse}</td>
                    <td className={`py-3 font-numbers font-semibold ${item.color}`}>{item.qty}</td>
                    <td className="py-3 text-xs text-psr-textSecondary">{item.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Operations panel */}
        <div className="bg-white rounded-xl border border-psr-border p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-heading font-semibold text-lg pb-4 border-b border-psr-border">System Integrity Status</h3>
            <div className="mt-4 space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-psr-success animate-pulse"></span>
                <span className="text-sm font-medium">Database Synchronized</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-psr-success"></span>
                <span className="text-sm font-medium">Revalidation Worker Active</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-psr-success"></span>
                <span className="text-sm font-medium">OpenAI LLM Parser Online</span>
              </div>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-psr-border">
            <p className="text-xs text-psr-textSecondary">
              For system architecture changes or database schema seeds, contact the Super Admin team.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
