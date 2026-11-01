import LZString from 'lz-string';

/**
 * Web Crypto API based AES-GCM + PBKDF2 encryption & LZString compression
 * for Firestore data backup and client-side privacy.
 */

// Derive AES-GCM key from userId + fixed app salt using PBKDF2
async function getCryptoKey(userId: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const salt = enc.encode(`wasedashboard_salt_${userId}`);
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(userId || 'wasedashboard_default_user'),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convert Base64 to ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export interface EncryptedCompressedPayload {
  payload: string; // Base64 encrypted cipher text
  iv: string;      // Base64 IV
  isEncrypted: boolean;
  isCompressed: boolean;
  updatedAt: string;
  version: number;
}

/**
 * Compress data with LZString and Encrypt with AES-GCM
 */
export async function compressAndEncrypt(
  data: any,
  userId: string
): Promise<EncryptedCompressedPayload> {
  // 1. JSON Stringify
  const jsonStr = JSON.stringify(data);

  // 2. Compress with LZString
  const compressed = LZString.compressToBase64(jsonStr);

  // 3. Encrypt compressed string with AES-GCM
  const key = await getCryptoKey(userId);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    enc.encode(compressed)
  );

  return {
    payload: arrayBufferToBase64(encryptedBuffer),
    iv: arrayBufferToBase64(iv.buffer),
    isEncrypted: true,
    isCompressed: true,
    updatedAt: new Date().toISOString(),
    version: 1,
  };
}

/**
 * Decrypt AES-GCM and Decompress LZString payload
 * Fallback gracefully if plain raw data object
 */
export async function decryptAndDecompress(
  input: any,
  userId: string
): Promise<any> {
  if (!input) return null;

  // If input is not in payload wrapper format (e.g., legacy unencrypted document)
  if (typeof input !== 'object' || !input.isEncrypted || !input.payload || !input.iv) {
    return input;
  }

  try {
    const key = await getCryptoKey(userId);
    const iv = new Uint8Array(base64ToArrayBuffer(input.iv));
    const cipherBuffer = base64ToArrayBuffer(input.payload);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      key,
      cipherBuffer
    );

    const dec = new TextDecoder();
    const compressedStr = dec.decode(decryptedBuffer);

    // Decompress
    const jsonStr = LZString.decompressFromBase64(compressedStr);
    if (!jsonStr) {
      throw new Error('Decompression returned null');
    }

    return JSON.parse(jsonStr);
  } catch (err) {
    console.warn('Failed to decrypt payload:', err);
    // If decryption fails, check if input itself can be returned
    return input;
  }
}
