import type { Request, Response } from 'express';
import QRCode from 'qrcode';
import bwipjs from 'bwip-js';

// Generate QR Code URL directing to the product page on the mobile/web application
export const getProductQRCode = async (req: Request, res: Response) => {
  const { productId } = req.params;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const productUrl = `${frontendUrl}/inventory/${productId}`;
  
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
      text: sku as string,
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
