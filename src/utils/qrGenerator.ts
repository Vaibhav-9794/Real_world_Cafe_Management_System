import { BRANDING } from '../config/branding';

/**
 * Generates the URL that a customer scans at their table.
 * Resolves to the digital menu with branch & table query parameters.
 */
export function getQRTargetUrl(branchId: string, tableNumber: string): string {
  // Use public environment url or fallback to localhost
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  return `${baseUrl}/menu?branch=${branchId}&table=${tableNumber}`;
}

/**
 * Returns a QR Code image URL using qrserver.com API.
 */
export function getQRCodeImageUrl(branchId: string, tableNumber: string, size = 300): string {
  const targetUrl = getQRTargetUrl(branchId, tableNumber);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&color=0d0a08&bgcolor=f5f2eb&data=${encodeURIComponent(targetUrl)}`;
}

/**
 * Downloads a QR code image file from the browser.
 * Since this runs on the client-side, we fetch the blob and download it.
 */
export async function downloadQRCodeAsset(branchId: string, tableNumber: string, size = 500): Promise<void> {
  const imageUrl = getQRCodeImageUrl(branchId, tableNumber, size);
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `QR_Code_Branch_${branchId}_Table_${tableNumber}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading QR code asset:', error);
  }
}
