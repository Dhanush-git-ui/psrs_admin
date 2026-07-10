import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import rateLimit from 'express-rate-limit';

// Initialize env vars before loading Clerk
dotenv.config();

// Clerk Express SDK looks for CLERK_PUBLISHABLE_KEY
process.env.CLERK_PUBLISHABLE_KEY = process.env.CLERK_PUBLISHABLE_KEY || process.env.VITE_CLERK_PUBLISHABLE_KEY;

import { clerkMiddleware } from '@clerk/express';
import { addProduct, getProducts, getInventory, getCategories, adjustStock } from './server/src/controllers/product.controller';
import { getProductQRCode, getProductBarcode } from './server/src/controllers/code.controller';
import { handleSmartSearch } from './server/src/controllers/ai.controller';
import { scanInvoice } from './server/src/controllers/ocr.controller';
import { getQuotations, updateQuotationStatus, createQuotation } from './server/src/controllers/quotation.controller';

const app = express();
const upload = multer({ dest: 'uploads/' });

// Middleware to require authentication (Clerk)
export const requireClerkAuth = (req: any, res: any, next: any) => {
  if (!req.auth?.userId) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required.' });
  }
  next();
};

// Middleware to check Admin privileges using Clerk JWT claims
export const requireAdmin = (req: any, res: any, next: any) => {
  const defaultRole = process.env.NODE_ENV === 'development' ? 'ADMIN' : 'WAREHOUSE_STAFF';
  const role = req.auth?.sessionClaims?.metadata?.role || req.auth?.sessionClaims?.role || defaultRole;
  if (role !== 'SUPER_ADMIN' && role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }
  next();
};

// Rate limiter scoped to user ID for cost-heavy AI / OCR routes
const aiOcrLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 20, // limit each user to 20 requests per windowMs
  validate: false, // bypass express-rate-limit keyGenerator validator for IPv6
  keyGenerator: (req: any) => {
    return req.auth?.userId || req.ip || 'anonymous';
  },
  handler: (req, res) => {
    res.status(429).json({ error: 'Too many requests. Please try again after an hour.' });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const allowedOrigins = [
  'http://localhost:5173', // React Admin Local
  'http://localhost:5174', // React Client Local
  'http://localhost:3000', // Local port
  'https://psrs.vercel.app', // Live Website
  'https://psrs-admin.vercel.app', // Admin site live
  'https://psrs-admin-dhanush-git-uis-projects.vercel.app', // User Specific Admin Site
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.indexOf(origin) !== -1 || origin.includes('vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS policy'));
    }
  },
  credentials: true
}));

app.use(express.json());
app.use(clerkMiddleware());

// Mutating admin-only endpoints
app.post('/api/products', requireClerkAuth, requireAdmin, addProduct);

// Protected endpoints accessible by authenticated staff/admin
app.post('/api/products/adjust-stock', adjustStock); // Publicly accessible to allow client website sync
app.post('/api/ai/search', requireClerkAuth, aiOcrLimiter, handleSmartSearch);
app.post('/api/ocr/scan', requireClerkAuth, upload.single('invoice'), aiOcrLimiter, scanInvoice);

// Quotations endpoints
app.post('/api/quotations', createQuotation); // Public submission from client app
app.get('/api/quotations', requireClerkAuth, getQuotations); // Secured fetch for admin
app.patch('/api/quotations/:id', requireClerkAuth, updateQuotationStatus); // Status update for admin

// Publicly readable endpoints (or optionally authenticated)
app.get('/api/products', getProducts);
app.get('/api/inventory', getInventory);
app.get('/api/categories', getCategories);
app.get('/api/products/:productId/qrcode', getProductQRCode);
app.get('/api/products/:sku/barcode', getProductBarcode);

export default app;
