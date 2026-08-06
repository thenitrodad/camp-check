import { Platform } from 'react-native';

export interface ParsedBookingData {
  guestName: string | null;
  checkIn: string | null;   // YYYY-MM-DD
  checkOut: string | null;  // YYYY-MM-DD
  amount: number;
  platform: string | null;
  notes: string | null;
}

function getApiBase(): string {
  // On web, use the current origin so the Replit path-based proxy routes correctly
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}/api`;
  }
  // EXPO_PUBLIC_DOMAIN is injected by the Expo dev workflow as $REPLIT_DEV_DOMAIN
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `https://${domain}/api`;
  // Explicit override for custom/production deployments
  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (envUrl) return envUrl;
  // Should not reach here in a properly configured environment
  throw new Error('Cannot determine API base URL. Set EXPO_PUBLIC_API_BASE_URL.');
}

// 5 MB raw ≈ 6.7 MB base64 — hard cap to avoid accidental cost spikes
const MAX_BASE64_LENGTH = 7 * 1024 * 1024; // ~7 MB characters

/**
 * Sends a base64-encoded image to the API server and returns parsed booking data.
 * @param imageBase64  The raw base64 string (no data: prefix)
 * @param mimeType     MIME type of the image, e.g. 'image/jpeg'
 */
export async function parseBookingImage(
  imageBase64: string,
  mimeType = 'image/jpeg',
): Promise<ParsedBookingData> {
  if (imageBase64.length > MAX_BASE64_LENGTH) {
    throw new Error('Image is too large to send (max ~5 MB). Please choose a smaller screenshot.');
  }

  const url = `${getApiBase()}/openai/parse-booking-image`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64, mimeType }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Server error ${response.status}: ${err}`);
  }

  return response.json() as Promise<ParsedBookingData>;
}
