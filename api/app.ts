import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { addProduct, getProducts, getInventory, getCategories } from './server/src/controllers/product.controller';
import { getProductQRCode, getProductBarcode } from './server/src/controllers/code.controller';
import { handleSmartSearch } from './server/src/controllers/ai.controller';
import { scanInvoice } from './server/src/controllers/ocr.controller';
import multer from 'multer';

dotenv.config();
const app = express();
const upload = multer({ dest: 'uploads/' }); // or memoryStorage()

const allowedOrigins = [
  'http://localhost:5173', // React Admin Local
  'https://psrs.vercel.app', // Live Website
  'https://psrs-admin.vercel.app' // Admin site live
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS policy'));
    }
  },
  credentials: true
}));

app.use(express.json());
// Add API endpoints
app.post('/api/products', addProduct);
app.get('/api/products', getProducts);
app.get('/api/inventory', getInventory);
app.get('/api/categories', getCategories);
app.get('/api/products/:productId/qrcode', getProductQRCode);
app.get('/api/products/:sku/barcode', getProductBarcode);
app.post('/api/ai/search', handleSmartSearch);



app.post('/api/ocr/scan', upload.single('invoice'), scanInvoice);
export default app;
