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
    let results = await prisma.product.findMany({
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

    if (parsedFilter.lowStockOnly) {
      results = results.filter(product => product.currentStock < product.minStock);
    }
    return res.json({ filters: parsedFilter, results });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};