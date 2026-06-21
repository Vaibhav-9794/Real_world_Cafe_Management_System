import crypto from 'crypto';

const SECRET_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'boho_lounge_fallback_secure_hash_secret_key_99';

export function generateActionLink(reservationId: string, action: 'approve' | 'reject', expiryHours = 48): string {
  const expires = Date.now() + expiryHours * 60 * 60 * 1000;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  
  const token = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(`${action}:${reservationId}:${expires}`)
    .digest('hex');

  return `${siteUrl}/api/reservation/action?action=${action}&id=${reservationId}&expires=${expires}&token=${token}`;
}

export function verifyActionToken(reservationId: string, action: 'approve' | 'reject', expires: number, token: string): boolean {
  if (Date.now() > expires) {
    return false; // Link expired
  }

  const expectedToken = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(`${action}:${reservationId}:${expires}`)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken));
  } catch {
    return false;
  }
}
