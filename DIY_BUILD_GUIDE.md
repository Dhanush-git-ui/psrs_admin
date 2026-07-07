# DIY Build Guide: PSR Warehouse & Inventory Management System (React SPA)

Welcome! This document provides a complete technical blueprint and step-by-step implementation guide to build the **PSR Warehouse & Inventory Management System** from scratch using a decoupled Monorepo architecture with a **Vite + React SPA** frontend and a **Node.js/Express + Prisma** backend.

---

## 1. Project Directory Structure

We will set this up as a decoupled **Monorepo** structure. This separates the backend API server from the frontend React client.

Create the following folder structure in your workspace:

```text
psrs-admin/
├── client/                     # Vite + React 19 (Frontend Dashboard)
│   ├── src/
│   │   ├── components/         # Reusable presentation components
│   │   │   ├── ui/             # Shadcn UI primitives (Button, Input, Dialog, etc.)
│   │   │   ├── Sidebar.tsx     # Navigation sidebar matching PRD specifications
│   │   │   └── Layout.tsx      # Sidebar + header layout shell
│   │   ├── pages/              # SPA route page views
│   │   │   ├── Dashboard.tsx   # Dashboard analytics charts & cards
│   │   │   ├── Login.tsx       # Auth login page
│   │   │   ├── Inventory.tsx   # Inventory cards list & details view
│   │   │   ├── Products.tsx    # Product CRUD forms and specifications
│   │   │   ├── Projects.tsx    # Project lists, timelines & notes
│   │   │   ├── Warehouse.tsx   # Warehouse/Rack/Position grid
│   │   │   ├── StockEntry.tsx  # Inbound stock arrival forms
│   │   │   ├── StockOut.tsx    # Outbound stock exit forms
│   │   │   ├── Damaged.tsx     # Damaged inventory logger
│   │   │   └── Reports.tsx     # PDF/Excel report builder
│   │   ├── hooks/              # Custom React hooks (voice commands, timers)
│   │   ├── lib/                # API clients (axios), styling helpers (cn)
│   │   ├── App.tsx             # React Router routing & Clerk Auth provider
│   │   ├── index.css           # Global custom Tailwind CSS styles
│   │   └── main.tsx            # DOM entrypoint
│   ├── public/                 # Static assets (images, static files)
│   ├── index.html              # Main HTML entrypoint
│   ├── package.json
│   ├── vite.config.ts          # Vite bundler options
│   ├── tailwind.config.js      # Tailwind configuration with PSR colors
│   └── tsconfig.json
├── server/                     # Node.js + Express + Prisma (Backend API)
│   ├── src/
│   │   ├── controllers/        # Request handlers (auth, inventory, AI)
│   │   ├── middleware/         # Auth verification, role checks, error handlers
│   │   ├── routes/             # Express routes definitions
│   │   ├── services/           # External integrations (OCR, OpenAI API, PDF reports)
│   │   ├── app.ts              # Express initialization
│   │   └── index.ts            # Listen server
│   ├── prisma/
│   │   ├── schema.prisma       # Database models and relations
│   │   └── seed.ts             # Seed script for categories and admin users
│   ├── package.json
│   ├── tsconfig.json
│   └── .env                    # Environment credentials
└── README.md
```

---

## 2. Database Schema (Prisma & PostgreSQL)

Create `server/prisma/schema.prisma` with the models representing the complete physical structure of the warehouse, product attributes, transaction history, and AI requirements.

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum UserRole {
  SUPER_ADMIN
  ADMIN
  WAREHOUSE_STAFF
  MANAGER
}

enum ProjectStatus {
  ACTIVE
  ON_HOLD
  COMPLETED
  CANCELLED
}

enum ProductStatus {
  AVAILABLE
  LOW_STOCK
  OUT_OF_STOCK
  DAMAGED
}

enum MovementAction {
  CREATED
  UPDATED
  STOCK_ADDED
  STOCK_REMOVED
  PRODUCT_MOVED
  ASSIGNED_TO_PROJECT
  RETURNED
  DAMAGED
}

model User {
  id           String        @id @default(uuid())
  email        String        @unique
  name         String
  role         UserRole      @default(WAREHOUSE_STAFF)
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  
  // Relations
  managedWarehouses Warehouse[]  @relation("WarehouseManager")
  projects          Project[]    @relation("ProjectEngineer")
  receivedEntries   StockEntry[] @relation("ReceivedBy")
  issuedStockOuts   StockOut[]   @relation("IssuedTo")
  loggedStockOuts   StockOut[]   @relation("EmployeeLogger")
  movements         ProductMovement[]
  damagedReports    DamagedInventory[]
  activityLogs      ActivityLog[]
}

model Category {
  id        String    @id @default(uuid())
  name      String    @unique
  products  Product[]
}

model Supplier {
  id            String       @id @default(uuid())
  name          String
  contactNumber String
  email         String?
  address       String?
  products      Product[]
  stockEntries  StockEntry[]
}

model Product {
  id                 String             @id @default(uuid())
  name               String
  code               String             @unique // Custom unique code
  sku                String             @unique
  partNumber         String?
  modelNumber        String?
  categoryId         String
  category           Category           @relation(fields: [categoryId], references: [id])
  compatibleMachine  String?
  description        String?
  material           String?
  weight             Float?             // Weight in kg
  length             Float?             // dimensions in mm
  width              Float?
  height             Float?
  unit               String             @default("pcs") // pcs, meters, sets etc.
  manufacturer       String?
  supplierId         String?
  supplier           Supplier?          @relation(fields: [supplierId], references: [id])
  
  // Stock levels
  minStock           Int                @default(10)
  maxStock           Int                @default(1000)
  currentStock       Int                @default(0)
  reservedStock      Int                @default(0)
  status             ProductStatus      @default(AVAILABLE)
  
  // Document links
  images             String[]           // Array of image URLs (Cloudinary/S3)
  technicalDrawing   String?
  explodedView       String?
  datasheetPdf       String?
  installationManual String?
  qrCode             String?
  barcode            String?

  createdAt          DateTime           @default(now())
  updatedAt          DateTime           @updatedAt

  // Relations
  stockLocations     ProductLocation[]
  stockEntries       StockEntry[]
  stockOuts          StockOut[]
  projectAllocations ProjectAllocation[]
  damagedRecords     DamagedInventory[]
  movements          ProductMovement[]
}

model Warehouse {
  id             String            @id @default(uuid())
  name           String            @unique
  code           String            @unique
  address        String
  capacity       Int               // Total item slots/capacity
  managerId      String?
  manager        User?             @relation("WarehouseManager", fields: [managerId], references: [id])
  description    String?
  
  racks          Rack[]
  stockLocations ProductLocation[]
  stockEntries   StockEntry[]
  movements      ProductMovement[]
}

model Rack {
  id          String            @id @default(uuid())
  name        String            // Rack A, Rack B, etc.
  warehouseId String
  warehouse   Warehouse         @relation(fields: [warehouseId], references: [id], onDelete: Cascade)
  positions   Position[]
  stockLocations ProductLocation[]
  stockEntries   StockEntry[]
  movements      ProductMovement[]
}

model Position {
  id             String            @id @default(uuid())
  name           String            // Position 1, Position 2
  rackId         String
  rack           Rack              @relation(fields: [rackId], references: [id], onDelete: Cascade)
  stockLocations ProductLocation[]
  stockEntries   StockEntry[]
}

// Junction table showing where current items reside
model ProductLocation {
  id          String    @id @default(uuid())
  productId   String
  product     Product   @relation(fields: [productId], references: [id], onDelete: Cascade)
  warehouseId String
  warehouse   Warehouse @relation(fields: [warehouseId], references: [id])
  rackId      String
  rack        Rack      @relation(fields: [rackId], references: [id])
  positionId  String
  position    Position  @relation(fields: [positionId], references: [id])
  shelfNumber String    // e.g. Shelf 1, Shelf 2
  quantity    Int       @default(0)

  @@unique([productId, warehouseId, rackId, positionId, shelfNumber])
}

model Project {
  id                 String              @id @default(uuid())
  name               String
  clientName         String
  code               String              @unique
  description        String?
  startDate          DateTime
  endDate            DateTime?
  status             ProjectStatus       @default(ACTIVE)
  images             String[]
  documents          String[]
  engineerId         String?
  engineer           User?               @relation("ProjectEngineer", fields: [engineerId], references: [id])
  notes              String?
  
  createdAt          DateTime            @default(now())
  updatedAt          DateTime            @updatedAt

  projectAllocations ProjectAllocation[]
  stockEntries       StockEntry[]
  stockOuts          StockOut[]
}

model ProjectAllocation {
  id        String   @id @default(uuid())
  projectId String
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  productId String
  product   Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  quantity  Int      // Reserved quantity
  status    String   @default("PENDING") // PENDING, DISPATCHED, RETURNED
  createdAt DateTime @default(now())
}

model StockEntry {
  id            String    @id @default(uuid())
  entryDate     DateTime  @default(now())
  invoiceNumber String
  supplierId    String
  supplier      Supplier  @relation(fields: [supplierId], references: [id])
  projectId     String?
  project       Project?  @relation(fields: [projectId], references: [id])
  productId     String
  product       Product   @relation(fields: [productId], references: [id])
  quantity      Int
  batchNumber   String?
  mfgDate       DateTime?
  receivedById  String
  receivedBy    User      @relation("ReceivedBy", fields: [receivedById], references: [id])
  warehouseId   String
  warehouse     Warehouse @relation(fields: [warehouseId], references: [id])
  rackId        String
  rack          Rack      @relation(fields: [rackId], references: [id])
  positionId    String
  position      Position  @relation(fields: [positionId], references: [id])
  shelfNumber   String
  
  // Package specifics
  width         Float?
  height        Float?
  length        Float?
  weight        Float?
  productImage  String?
  notes         String?
}

model StockOut {
  id          String   @id @default(uuid())
  productId   String
  product     Product  @relation(fields: [productId], references: [id])
  quantity    Int
  projectId   String?
  project     Project? @relation(fields: [projectId], references: [id])
  issuedToId  String
  issuedTo    User     @relation("IssuedTo", fields: [issuedToId], references: [id])
  employeeId  String
  employee    User     @relation("EmployeeLogger", fields: [employeeId], references: [id])
  date        DateTime @default(now())
  purpose     String
  remarks     String?
}

model ProductMovement {
  id          String         @id @default(uuid())
  timestamp   DateTime       @default(now())
  action      MovementAction
  productId   String
  product     Product        @relation(fields: [productId], references: [id])
  userId      String
  user        User           @relation(fields: [userId], references: [id])
  warehouseId String
  warehouse   Warehouse      @relation(fields: [warehouseId], references: [id])
  rackId      String
  rack        Rack           @relation(fields: [rackId], references: [id])
  quantity    Int
  remarks     String?
}

model DamagedInventory {
  id         String   @id @default(uuid())
  productId  String
  product    Product  @relation(fields: [productId], references: [id])
  quantity   Int
  reason     String
  images     String[]
  employeeId String
  employee   User     @relation(fields: [employeeId], references: [id])
  date       DateTime @default(now())
}

model ActivityLog {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  action    String
  timestamp DateTime @default(now())
  ipAddress String?
  browser   String?
}

model Notification {
  id        String   @id @default(uuid())
  type      String   // LOW_STOCK, OUT_OF_STOCK, WAREHOUSE_FULL, etc.
  message   String
  isRead    Boolean  @default(false)
  timestamp DateTime @default(now())
}
```

---

## 3. UI Design System Configuration (Tailwind CSS)

To match the custom, premium design principles outlined in the PRD, create `client/tailwind.config.js` configured with content filters matching the React SPA folder structure and custom palette tokens.

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // PSR Custom Color Palette
        psr: {
          red: '#C8102E',      // Primary Red
          darkRed: '#99001E',  // Accent Dark Red
          lightRed: '#FDEBEC', // Subdued background red
          bg: '#F8F9FB',       // Body background
          textPrimary: '#1E1E1E',
          textSecondary: '#6B7280',
          border: '#E5E7EB',
          success: '#22C55E',
          warning: '#F59E0B',
          danger: '#EF4444',
        }
      },
      fontFamily: {
        display: ['Clash Display', 'sans-serif'],
        heading: ['General Sans', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        numbers: ['Space Grotesk', 'monospace'],
        buttons: ['Satoshi', 'sans-serif'],
      },
      boxShadow: {
        premium: '0 4px 20px -2px rgba(200, 16, 46, 0.05), 0 2px 8px -1px rgba(0, 0, 0, 0.02)',
        glass: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.1)',
      },
      backdropBlur: {
        premium: '16px',
      }
    },
  },
  plugins: [],
}
```

### Premium UI Base Styling (`client/src/index.css`)
Add custom utility classes for **Glassmorphism**, Custom Fonts, and CSS animations inside your `index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap');

@layer base {
  body {
    @apply bg-psr-bg text-psr-textPrimary font-body antialiased selection:bg-psr-lightRed selection:text-psr-red;
  }
  
  h1, h2, h3, h4, h5, h6 {
    @apply font-heading font-semibold tracking-tight;
  }
}

/* Glassmorphism Classes */
.glass-panel {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(229, 231, 235, 0.5);
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.03);
}

.dark .glass-panel {
  background: rgba(30, 30, 30, 0.7);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

/* Premium Hover Transitions */
.hover-lift {
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease;
}
.hover-lift:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px -5px rgba(200, 16, 46, 0.08);
}
```

---

## 4. Feature Implementation Details

### A. Dynamic QR & Barcode Generation
To automatically generate QR codes and barcodes for products, use the libraries `qrcode` and `bwip-js` (or `jsbarcode`) in your backend API.

#### Barcode & QR Code Backend Router (`server/src/controllers/code.controller.ts`)
```typescript
import { Request, Response } from 'express';
import QRCode from 'qrcode';
import bwipjs from 'bwip-js';

// Generate QR Code URL directing to the product page on the mobile/web application
export const getProductQRCode = async (req: Request, res: Response) => {
  const { productId } = req.params;
  const productUrl = `${process.env.FRONTEND_URL}/inventory/${productId}`;
  
  try {
    const qrDataUrl = await QRCode.toDataURL(productUrl, {
      color: {
        dark: '#C8102E', // PSR Red color code
        light: '#FFFFFF'
      },
      width: 300,
      margin: 2
    });
    return res.json({ qrCode: qrDataUrl });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to generate QR Code' });
  }
};

// Generate barcode (Code 128) image buffer
export const getProductBarcode = async (req: Request, res: Response) => {
  const { sku } = req.params;
  
  try {
    const pngBuffer = await bwipjs.toBuffer({
      bcid: 'code128',
      text: sku,
      scale: 3,
      height: 10,
      includetext: true,
      textxalign: 'center',
    });
    
    res.type('png');
    return res.send(pngBuffer);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to generate barcode' });
  }
};
```

---

### B. AI Smart Inventory Search (Natural Language Parser)
Use **OpenAI Function Calling** or a lightweight LLM API route to convert a natural language query like *"Show all Rotation Motors in Rack B"* into structured search params that query Prisma.

#### Backend Controller (`server/src/controllers/ai.controller.ts`)
```typescript
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { OpenAI } from 'openai';

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const handleSmartSearch = async (req: Request, res: Response) => {
  const { query } = req.body; // e.g. "Find button bits with quantity less than 20 in warehouse A"
  
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content: `You are an AI search assistant for PSR Warehouse. Convert natural language queries into Prisma filter objects.
          Available models to reference: Product, Category, Warehouse, Rack.
          Return a JSON payload with keys:
          - categoryName (string, optional)
          - warehouseName (string, optional)
          - rackName (string, optional)
          - lowStockOnly (boolean, optional)
          - textSearch (string, optional)`
        },
        { role: 'user', content: query }
      ],
      response_format: { type: 'json_object' }
    });

    const parsedFilter = JSON.parse(response.choices[0].message.content || '{}');
    
    // Construct database query based on LLM output
    const results = await prisma.product.findMany({
      where: {
        AND: [
          parsedFilter.textSearch ? {
            OR: [
              { name: { contains: parsedFilter.textSearch, mode: 'insensitive' } },
              { sku: { contains: parsedFilter.textSearch, mode: 'insensitive' } }
            ]
          } : {},
          parsedFilter.categoryName ? {
            category: { name: { contains: parsedFilter.categoryName, mode: 'insensitive' } }
          } : {},
          parsedFilter.lowStockOnly ? {
            currentStock: { lt: prisma.product.fields.minStock }
          } : {},
          parsedFilter.warehouseName || parsedFilter.rackName ? {
            stockLocations: {
              some: {
                AND: [
                  parsedFilter.warehouseName ? { warehouse: { name: { contains: parsedFilter.warehouseName, mode: 'insensitive' } } } : {},
                  parsedFilter.rackName ? { rack: { name: { contains: parsedFilter.rackName, mode: 'insensitive' } } } : {},
                ]
              }
            }
          } : {}
        ]
      },
      include: {
        category: true,
        stockLocations: {
          include: { warehouse: true, rack: true, position: true }
        }
      }
    });

    return res.json({ filters: parsedFilter, results });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};
```

---

### C. Voice Commands Integration (Frontend Speech-to-Text)
Implement voice commands by using the browser's native `webkitSpeechRecognition` API. This allows warehouse operators on mobile devices to manage stock hands-free.

#### React Hook (`client/src/hooks/useVoiceCommand.ts`)
```typescript
import { useState, useEffect } from 'react';

export const useVoiceCommand = (onCommandRecognized: (command: string) => void) => {
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = 'en-US';

        rec.onstart = () => setIsListening(true);
        rec.onend = () => setIsListening(false);
        rec.onresult = (event: any) => {
          const commandText = event.results[0][0].transcript;
          onCommandRecognized(commandText);
        };

        setRecognition(rec);
      }
    }
  }, [onCommandRecognized]);

  const startListening = () => {
    if (recognition) recognition.start();
  };

  const stopListening = () => {
    if (recognition) recognition.stop();
  };

  return { isListening, startListening, stopListening, hasSupport: !!recognition };
};
```

---

### D. OCR Invoice Scanner
Allows staff to scan supplier invoices and auto-fill stock entry details using `Tesseract.js` directly in the browser, or via backend OCR APIs.

#### Backend Route with Tesseract.js / OpenAI Vision (`server/src/controllers/ocr.controller.ts`)
```typescript
import { Request, Response } from 'express';
import { createWorker } from 'tesseract.js';
import OpenAI from 'openai';

const openai = new OpenAI();

export const scanInvoice = async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Invoice file is required' });
  }

  try {
    // 1. Extract raw text via Tesseract OCR
    const worker = await createWorker('eng');
    const { data: { text } } = await worker.recognize(req.file.path);
    await worker.terminate();

    // 2. Parse structured details (invoice number, product code, quantity, supplier) using GPT
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content: `You are an OCR receipt parser. Extract variables from raw OCR output.
          Return a JSON array of objects representing items, with the properties:
          - invoiceNumber (string)
          - supplierName (string)
          - productName (string)
          - quantity (number)
          - batchNumber (string or null)`
        },
        { role: 'user', content: text }
      ],
      response_format: { type: 'json_object' }
    });

    const parsedInvoice = JSON.parse(response.choices[0].message.content || '{}');
    return res.json(parsedInvoice);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};
```

---

### E. Frontend SPA Routing & Auth Integration (React SPA)
Use `react-router-dom` to build the client SPA and Clerk's react SDK (`@clerk/clerk-react`) to restrict page views by user roles.

#### Router setup (`client/src/App.tsx`)
```tsx
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
```

---

## 5. Setup and Run Guide

Follow these sequential phases to spin up the system.

### Phase 1: Initialize Project Directory & Git
Run these commands in your shell to construct both workspaces:
```powershell
# 1. Initialize the monorepo root
git init

# 2. Create the backend folder
mkdir server
cd server
npm init -y
npm install express dotenv cors @prisma/client qrcode bwip-js tesseract.js openai
npm install --save-dev typescript @types/express @types/node ts-node prisma nodemon
npx prisma init
cd ..

# 3. Create the frontend React application using Vite
npm create vite@latest client -- --template react-ts
cd client
npm install
npm install react-router-dom framer-motion gsap lucide-react clsx tailwind-merge @radix-ui/react-dialog @clerk/clerk-react axios
```

### Phase 2: Connect the Database & Seed
1. Create a Neon PostgreSQL instance.
2. In `server/.env`, insert:
   ```env
   DATABASE_URL="postgresql://user:password@neon-db-url/dbname?sslmode=require"
   PORT=5000
   OPENAI_API_KEY="your-openai-api-key"
   ```
3. Run `npx prisma db push` inside the `server` folder to initialize all tables and relationships on the live database.
4. Run `npx prisma generate` to update your Prisma client libraries.

### Phase 3: Start Development Servers
Use concurrent processes or open two terminals:

**Terminal 1 (Backend API):**
```powershell
cd server
# Add script "dev": "nodemon src/index.ts" to package.json
npm run dev
```

**Terminal 2 (Frontend Dashboard):**
```powershell
cd client
# Run Vite local server
npm run dev
```
Open `http://localhost:5173` (Vite's default port) to preview your React system.

---

## 6. Verification and Deployment Checklist

### Verification Plan
- **Database integrity**: Check that adding stock increments `Product.currentStock` and updates the junction table `ProductLocation`.
- **Search System Latency**: Index SKU, Code, and barcode fields in Prisma to guarantee response times under 5 seconds.
- **Access Roles Validation**: Check role metadata assertions inside your React SPA router guards before rendering views.

### Deployment Instructions
- **Database hosting**: Deploy Postgres to **Neon**.
- **Backend API**: Host on **Railway** or Render, injecting environment variables for DB URL and APIs.
- **Frontend Dashboard**: Connect your GitHub repository to **Vercel** or Netlify with automatic SPA static asset building.

---

## 7. Syncing & Reflecting Uploads on Main Website (https://psrs.vercel.app/)

To ensure that any product creation, image upload, or stock entry made in the Admin Dashboard **reflects immediately** on the main website (`https://psrs.vercel.app/`), follow this three-step synchronization pattern.

### Step 1: Connect to the Shared Database
Both this Admin backend (`server`) and the main website (`https://psrs.vercel.app/`) must share the **same Neon PostgreSQL database instance**.

1. Retrieve the `DATABASE_URL` currently used by `https://psrs.vercel.app/` (configured in its Vercel deployment variables).
2. Set that exact connection string in your admin backend `.env` file:
   ```env
   # server/.env
   DATABASE_URL="postgresql://user:password@neon-db-url/dbname?sslmode=require"
   ```
Since the main website queries the same Postgres tables, any database operations (such as new products or stock entries) are persistent and instantly accessible.

### Step 2: Implement On-Demand Cache Revalidation (Next.js/Vercel)
If the main website `https://psrs.vercel.app/` uses **Incremental Static Regeneration (ISR)** or edge caching for ultra-fast load times, it won't pull the database updates on page reload unless the cache is revalidated.

Create a revalidation hook in your admin server controllers that triggers whenever a product is created, edited, or deleted.

#### Backend Revalidation Helper (`server/src/services/revalidate.service.ts`)
```typescript
import axios from 'axios';

/**
 * Triggers a secure cache revalidation request on the main website
 * @param productId The ID of the modified product
 */
export const triggerMainSiteRevalidate = async (productId: string) => {
  const mainSiteUrl = 'https://psrs.vercel.app/api/revalidate';
  const revalidateSecret = process.env.MAIN_SITE_REVALIDATE_SECRET;

  if (!revalidateSecret) {
    console.warn('MAIN_SITE_REVALIDATE_SECRET is not configured. Skipping revalidation.');
    return;
  }

  try {
    await axios.post(
      mainSiteUrl,
      {
        secret: revalidateSecret,
        paths: [
          '/',                    // Revalidate dashboard homepage
          '/inventory',           // Revalidate product listing
          `/inventory/${productId}` // Revalidate specific product page
        ]
      },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
    console.log(`[Revalidate] Instantly revalidated cache on https://psrs.vercel.app/ for product ${productId}`);
  } catch (error: any) {
    console.error(`[Revalidate Error] Failed to invalidate main website cache:`, error.response?.data || error.message);
  }
};
```

**Trigger this function in your product routes:**
```typescript
// server/src/controllers/product.controller.ts
export const addProduct = async (req: Request, res: Response) => {
  try {
    const newProduct = await prisma.product.create({ data: req.body });
    
    // Trigger instant cache revalidation on the main website
    await triggerMainSiteRevalidate(newProduct.id);

    return res.status(201).json(newProduct);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};
```

### Step 3: Configure CORS for Public API Fetching
If the main website fetches live JSON data via REST APIs directly from your admin backend, configure Express CORS to permit requests from the Vercel domain.

#### Backend Express App Configuration (`server/src/app.ts`)
```typescript
import express from 'express';
import cors from 'cors';

const app = express();

const allowedOrigins = [
  'http://localhost:5173', // React Admin Local
  'https://psrs.vercel.app' // Live Website
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
```

