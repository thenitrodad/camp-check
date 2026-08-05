/**
 * Upload a local photo URI to cloud object storage via the API server.
 * Returns the permanent serving URL, or null on failure.
 */
import * as FileSystem from 'expo-file-system';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://camp-check-owner.replit.app';

export async function uploadInspectionPhoto(localUri: string): Promise<string | null> {
  try {
    // 1. Request a presigned upload URL from the API server
    const metaRes = await fetch(`${API_URL}/api/storage/uploads/request-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'inspection.jpg', contentType: 'image/jpeg' }),
    });
    if (!metaRes.ok) throw new Error(`URL request failed: ${metaRes.status}`);
    const { uploadURL, objectPath } = await metaRes.json();

    // 2. Read the local file as base64, then upload directly to GCS
    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Convert base64 → binary string → Uint8Array for the PUT body
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const uploadRes = await fetch(uploadURL, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/jpeg' },
      body: bytes,
    });
    if (!uploadRes.ok) throw new Error(`GCS upload failed: ${uploadRes.status}`);

    // 3. Return the permanent serving URL via our API proxy
    // objectPath is e.g. /objects/uploads/some-uuid → GET /api/storage/objects/uploads/some-uuid
    return `${API_URL}/api/storage${objectPath}`;
  } catch (err) {
    console.error('[uploadInspectionPhoto]', err);
    return null;
  }
}
