import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ClerkProvider, SignedIn, SignedOut } from '@clerk/clerk-react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Inventory from './pages/Inventory';
import Products from './pages/Products';
import Warehouse from './pages/Warehouse';
import StockEntry from './pages/StockEntry';
import StockOut from './pages/StockOut';

// Fetch Clerk Key from process.env (Vite uses import.meta.env)
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Route guard checking matching roles
const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) => {
  return (
    <>
      <SignedIn>
        {/* Replace this with dynamic verification querying user.publicMetadata.role */}
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
          <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
          <Route path="/warehouse" element={<ProtectedRoute><Warehouse /></ProtectedRoute>} />
          
          {/* Warehouse Staff / Admin only paths */}
          <Route path="/stock-entry" element={<ProtectedRoute><StockEntry /></ProtectedRoute>} />
          <Route path="/stock-out" element={<ProtectedRoute><StockOut /></ProtectedRoute>} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ClerkProvider>
  );
}