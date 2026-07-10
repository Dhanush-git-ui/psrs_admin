import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { OpenAI } from 'openai';

import { z } from 'zod';

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'dummy_key' });

const aiSearchSchema = z.object({
  query: z.string().min(1, 'Query is required').max(1000, 'Query must be under 1000 characters'),
});

export const handleSmartSearch = async (req: Request, res: Response) => {
  const validation = aiSearchSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.flatten().fieldErrors });
  }

  const { query } = validation.data;
  
  if (!process.env.OPENAI_API_KEY) {
    return res.status(400).json({ error: 'OPENAI_API_KEY is not configured in the environment' });
  }

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
