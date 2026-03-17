// Simple token encryption using AES-GCM
// In production, use a proper key management service

const ENCRYPTION_KEY_ENV = 'TOKEN_ENCRYPTION_KEY';

async function getKey(): Promise<CryptoKey> {
  const keyString = Deno.env.get(ENCRYPTION_KEY_ENV);
  if (!keyString) {
    throw new Error(`${ENCRYPTION_KEY_ENV} not configured`);
  }

  const keyData = new TextEncoder().encode(keyString.padEnd(32, '0').slice(0, 32));
  return await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptToken(token: string): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(token);

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );

  // Combine iv + encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);

  // Base64 encode
  return btoa(String.fromCharCode(...combined));
}

export async function decryptToken(encryptedToken: string): Promise<string> {
  const key = await getKey();

  // Base64 decode
  const combined = Uint8Array.from(atob(encryptedToken), c => c.charCodeAt(0));

  // Extract iv and encrypted data
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encrypted
  );

  return new TextDecoder().decode(decrypted);
}
