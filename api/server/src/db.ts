import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

// Ensure DATABASE_URL is defined with fallback for Vercel serverless functions
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 
    process.env.POSTGRES_PRISMA_URL || 
    process.env.POSTGRES_URL || 
    'postgresql://neondb_owner:npg_PO3RAtB5zLZy@ep-aged-poetry-atcslhnh-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require&connect_timeout=30';
}

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
