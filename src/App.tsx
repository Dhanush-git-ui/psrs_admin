import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ClerkProvider, SignedIn, SignedOut, useUser } from '@clerk/clerk-react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Inventory from './pages/Inventory';
import Products from './pages/Products';
import Warehouse from './pages/Warehouse';
import StockEntry from './pages/StockEntry';
import StockOut from './pages/StockOut';
import Quotations from './pages/Quotations';

// Fetch Clerk Key from process.env (Vite uses import.meta.env)
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Route guard checking matching roles
const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) => {
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-psr-bg">
        <span className="animate-spin rounded-full h-8 w-8 border-4 border-psr-red border-t-transparent"></span>
      </div>
    );
  }

  const defaultRole = import.meta.env.DEV ? 'ADMIN' : 'WAREHOUSE_STAFF';
  const userRole = (user?.publicMetadata?.role as string | undefined) || defaultRole;

  if (allowedRoles && (!userRole || !allowedRoles.includes(userRole))) {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <SignedIn>
        <Layout>{children}</Layout>
      </SignedIn>
      <SignedOut>
        <Navigate to="/login" replace />
      </SignedOut>
    </>
  );
};

export default function App() {
  return (
    <ClerkProvider publishableKey={clerkPubKey}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
          <Route path="/products" element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}><Products /></ProtectedRoute>} />
          <Route path="/warehouse" element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN', 'MANAGER']}><Warehouse /></ProtectedRoute>} />
          <Route path="/quotations" element={<ProtectedRoute><Quotations /></ProtectedRoute>} />
          
          {/* Warehouse Staff / Admin only paths */}
          <Route path="/stock-entry" element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN', 'WAREHOUSE_STAFF', 'MANAGER']}><StockEntry /></ProtectedRoute>} />
          <Route path="/stock-out" element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN', 'WAREHOUSE_STAFF', 'MANAGER']}><StockOut /></ProtectedRoute>} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ClerkProvider>
  );
}