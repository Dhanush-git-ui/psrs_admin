import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const updateStatusSchema = z.object({
  status: z.enum(['PENDING', 'REVIEWED', 'APPROVED', 'REJECTED'])
});

const createQuotationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  company: z.string().min(1, 'Company is required'),
  phone: z.string().min(1, 'Phone is required'),
  country: z.string().min(1, 'Country is required'),
  port: z.string().min(1, 'Port is required'),
  urgency: z.string().min(1, 'Urgency is required'),
  message: z.string().nullable().optional(),
  items: z.array(z.object({
    productId: z.string(),
    name: z.string(),
    category: z.string(),
    quantity: z.number().int().positive(),
    specs: z.any().optional(),
  }))
});

export const getQuotations = async (_req: Request, res: Response) => {
  try {
    const quotations = await prisma.quotation.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });
    return res.json(quotations);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const updateQuotationStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const validation = updateStatusSchema.safeParse(req.body);
  
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.format() });
  }

  try {
    const quotation = await prisma.quotation.findUnique({
      where: { id }
    });

    if (!quotation) {
      return res.status(404).json({ error: 'Quotation not found' });
    }

    const updatedQuotation = await prisma.quotation.update({
      where: { id },
      data: {
        status: validation.data.status
      }
    });

    return res.json(updatedQuotation);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const createQuotation = async (req: Request, res: Response) => {
  const validation = createQuotationSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.format() });
  }

  try {
    const newQuotation = await prisma.quotation.create({
      data: {
        name: validation.data.name,
        email: validation.data.email,
        company: validation.data.company,
        phone: validation.data.phone,
        country: validation.data.country,
        port: validation.data.port,
        urgency: validation.data.urgency,
        message: validation.data.message || null,
        items: validation.data.items as any,
      }
    });

    return res.status(201).json(newQuotation);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};
