// client/src/components/Layout.tsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  Boxes, 
  Warehouse, 
  PlusSquare, 
  MinusSquare, 
  LogOut, 
  Bell, 
  Search 
} from 'lucide-react';
import { UserButton, useUser } from '@clerk/clerk-react';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Inventory', href: '/inventory', icon: Boxes },
    { name: 'Products', href: '/products', icon: Package },
    { name: 'Warehouse Grid', href: '/warehouse', icon: Warehouse },
    { name: 'Stock Entry', href: '/stock-entry', icon: PlusSquare },
    { name: 'Stock Out', href: '/stock-out', icon: MinusSquare },
  ];

  return (
    <div className="flex h-screen bg-psr-bg overflow-hidden font-body text-psr-textPrimary">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 glass-panel border-r border-psr-border">
        {/* Brand */}
        <div className="h-16 flex items-center px-6 gap-2 border-b border-psr-border">
          <div className="w-8 h-8 rounded bg-psr-red flex items-center justify-center text-white font-heading font-bold text-lg">
            P
          </div>
          <span className="font-heading font-semibold text-lg tracking-tight">PSR Admin</span>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-psr-red text-white shadow-premium'
                    : 'text-psr-textSecondary hover:bg-psr-lightRed hover:text-psr-red'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User Card */}
        <div className="p-4 border-t border-psr-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UserButton afterSignOutUrl="/login" />
            <div className="flex flex-col text-left">
              <span className="text-xs font-semibold">{user?.fullName || 'User'}</span>
              <span className="text-[10px] text-psr-textSecondary">Warehouse Staff</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Body container */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-psr-border flex items-center justify-between px-6 z-10">
          <h1 className="font-heading font-semibold text-xl tracking-tight">
            {navigation.find((n) => n.href === location.pathname)?.name || 'PSR Warehouse'}
          </h1>

          <div className="flex items-center gap-4">
            {/* Search Trigger */}
            <button className="p-2 text-psr-textSecondary hover:text-psr-red hover:bg-psr-lightRed rounded-full transition-all">
              <Search className="w-5 h-5" />
            </button>

            {/* Notification Bell */}
            <button className="p-2 text-psr-textSecondary hover:text-psr-red hover:bg-psr-lightRed rounded-full transition-all relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-psr-red rounded-full ring-2 ring-white"></span>
            </button>
          </div>
        </header>

        {/* Scrollable Content Container */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-psr-bg">
          {children}
        </main>
      </div>
    </div>
  );
}
