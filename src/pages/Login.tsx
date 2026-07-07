// client/src/pages/Login.tsx
import React from 'react';
import { SignIn } from '@clerk/clerk-react';

export default function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-psr-bg relative font-body overflow-hidden">
      {/* Background Graphic Blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-psr-lightRed rounded-full filter blur-[120px] opacity-70 pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-100 rounded-full filter blur-[120px] opacity-55 pointer-events-none"></div>

      {/* Login Card */}
      <div className="z-10 flex flex-col items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-psr-red flex items-center justify-center text-white font-heading font-bold text-2xl shadow-premium">
            P
          </div>
          <h1 className="font-heading font-bold text-2xl tracking-tight text-psr-textPrimary">PSR Warehouse</h1>
        </div>

        {/* Clerk Sign In component */}
        <div className="shadow-premium rounded-2xl overflow-hidden border border-psr-border bg-white/70 backdrop-blur-md">
          <SignIn 
            routing="hash"
            signUpUrl={undefined} // Disable registration for new users (invite/admin create only)
          />
        </div>
      </div>
    </div>
  );
}

