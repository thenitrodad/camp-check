/**
 * Resize then upload a local photo URI to cloud object storage.
 * Returns the permanent serving URL, or null on failure.
 */
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://camp-check-owner.replit.app';
const MAX_WIDTH = 1200; // px — keeps files ~150–300 KB instead of 2–4 MB

export async function uploadInspectionPhoto(localUri: string): Promise<string | null> {
  try {
    // 1. Resize to max 1200px wide, keeping aspect ratio
    const resized = await ImageManipulator.manipulateAsync(
      localUri,
      [{ resize: { width: MAX_WIDTH } }],
      { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG },
    );

    // 2. Request a presigned upload URL from the API server
    const metaRes = await fetch(`${API_URL}/api/storage/uploads/request-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'inspection.jpg', contentType: 'image/jpeg' }),
    });
    if (!metaRes.ok) throw new Error(`URL request failed: ${metaRes.status}`);
    const { uploadURL, objectPath } = await metaRes.json();

    // 3. Read resized file as base64 then PUT directly to GCS
    const base64 = await FileSystem.readAsStringAsync(resized.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const uploadRes = await fetch(uploadURL, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/jpeg' },
      body: bytes,
    });
    if (!uploadRes.ok) throw new Error(`GCS upload failed: ${uploadRes.status}`);

    // objectPath is e.g. /objects/uploads/uuid → GET /api/storage/objects/uploads/uuid
    return `${API_URL}/api/storage${objectPath}`;
  } catch (err) {
    console.error('[uploadInspectionPhoto]', err);
    return null;
  }
}
