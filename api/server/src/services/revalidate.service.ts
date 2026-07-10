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
