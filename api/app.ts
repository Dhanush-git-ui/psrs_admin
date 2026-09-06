import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import rateLimit from 'express-rate-limit';

// Initialize env vars before loading Clerk
dotenv.config();

// Ensure Clerk publishable key is set
process.env.CLERK_PUBLISHABLE_KEY = process.env.CLERK_PUBLISHABLE_KEY || process.env.VITE_CLERK_PUBLISHABLE_KEY;

import { clerkMiddleware } from '@clerk/express';
import { 
  addProduct, 
  deleteProduct, 
  updateProduct,
  getProducts, 
  getInventory, 
  getCategories, 
  getWarehouses,
  adjustStock 
} from './server/src/controllers/product.controller';
import { getProductQRCode, getProductBarcode } from './server/src/controllers/code.controller';
import { handleSmartSearch } from './server/src/controllers/ai.controller';
import { scanInvoice } from './server/src/controllers/ocr.controller';
import { getQuotations, updateQuotationStatus, createQuotation } from './server/src/controllers/quotation.controller';

const app = express();
const upload = multer({ dest: '/tmp' });

// Middleware to require authentication (Clerk)
export const requireClerkAuth = (req: any, res: any, next: any) => {
  if (process.env.NODE_ENV === 'development' || req.auth?.userId) {
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized: Authentication required.' });
};

// Middleware to check Admin privileges using Clerk JWT claims
export const requireAdmin = (req: any, res: any, next: any) => {
  const defaultRole = process.env.NODE_ENV === 'development' ? 'ADMIN' : 'WAREHOUSE_STAFF';
  const role = req.auth?.sessionClaims?.metadata?.role || req.auth?.sessionClaims?.role || defaultRole;
  if (role !== 'SUPER_ADMIN' && role !== 'ADMIN' && process.env.NODE_ENV !== 'development') {
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
  handler: (_req, res) => {
    res.status(429).json({ error: 'Too many requests. Please try again after an hour.' });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://localhost:8080',
  'https://drills-dun.vercel.app',
  'https://psrs-admin.vercel.app',
  'https://psrs.vercel.app',
  'https://psrs-admin-dhanush-git-uis-projects.vercel.app'
];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app') ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1')
    ) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Explicit fallback CORS headers
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Support large image payloads (Base64 uploads)
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Safe Clerk middleware initialization
try {
  const secretKey = process.env.CLERK_SECRET_KEY;
  const publishableKey = process.env.CLERK_PUBLISHABLE_KEY || process.env.VITE_CLERK_PUBLISHABLE_KEY;
  if (secretKey && publishableKey) {
    app.use((req, res, next) => {
      try {
        return clerkMiddleware({ secretKey, publishableKey })(req, res, next);
      } catch (e) {
        console.warn('Clerk middleware error, proceeding:', e);
        return next();
      }
    });
  }
} catch (clerkErr) {
  console.warn('[Clerk] Initialization warning:', clerkErr);
}

// Health Check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Products & Inventory Endpoints (mutating actions available to sync catalog)
app.post('/api/products', addProduct);
app.put('/api/products/:id', updateProduct);
app.patch('/api/products/:id', updateProduct);
app.delete('/api/products/:id', deleteProduct);
app.post('/api/products/adjust-stock', adjustStock);

// Protected endpoints for AI / OCR
app.post('/api/ai/search', aiOcrLimiter, handleSmartSearch);
app.post('/api/ocr/scan', upload.single('invoice'), aiOcrLimiter, scanInvoice);

// Quotations endpoints
app.post('/api/quotations', createQuotation);
app.get('/api/quotations', getQuotations);
app.patch('/api/quotations/:id', updateQuotationStatus);

// Publicly readable catalog endpoints
app.get('/api/products', getProducts);
app.get('/api/inventory', getInventory);
app.get('/api/categories', getCategories);
app.get('/api/warehouses', getWarehouses);
app.get('/api/products/:productId/qrcode', getProductQRCode);
app.get('/api/products/:sku/barcode', getProductBarcode);

// Global express error handler to ensure JSON is always returned
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[API Internal Server Error]:', err);
  res.status(500).json({ error: err?.message || 'A server error has occurred' });
});

export default app;
