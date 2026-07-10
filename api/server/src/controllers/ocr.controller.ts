import type { Request, Response } from 'express';
import { createWorker } from 'tesseract.js';
import OpenAI from 'openai';

// Use dummy key if not configured in environment to prevent immediate startup crash
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'dummy_key' });

export const scanInvoice = async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Invoice file is required' });
  }

  const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
  if (!allowedMimeTypes.includes(req.file.mimetype)) {
    return res.status(400).json({ error: 'Only PNG, JPEG, JPG, and PDF files are allowed.' });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(400).json({ error: 'OPENAI_API_KEY is not configured in the environment' });
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
