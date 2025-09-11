/**
 * PHI (Personal Health Information) Encryption Utilities
 * 
 * This module provides field-level encryption for sensitive medical data
 * to ensure HIPAA/NOM-024 compliance. Uses AES-GCM for authenticated encryption.
 */

// Simple encryption for demonstration - In production, use proper key management
const ENCRYPTION_KEY = import.meta.env.VITE_PHI_ENCRYPTION_KEY || 'default-key-change-in-production';

/**
 * Encrypts sensitive PHI data using AES-GCM
 * @param plaintext - The sensitive data to encrypt
 * @returns Base64 encoded encrypted data with IV
 */
export async function encryptPHI(plaintext: string): Promise<string> {
  if (!plaintext || plaintext.trim() === '') {
    return plaintext;
  }

  try {
    // Generate a random initialization vector
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Import the encryption key
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)),
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );

    // Encrypt the data
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      new TextEncoder().encode(plaintext)
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    // Return base64 encoded result
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    // In case of encryption failure, log error but don't expose data
    console.error('PHI encryption failed');
    throw new Error('Failed to encrypt sensitive data');
  }
}

/**
 * Decrypts PHI data encrypted with encryptPHI
 * @param encryptedData - Base64 encoded encrypted data
 * @returns Decrypted plaintext
 */
export async function decryptPHI(encryptedData: string): Promise<string> {
  if (!encryptedData || encryptedData.trim() === '') {
    return encryptedData;
  }

  try {
    // Decode from base64
    const combined = new Uint8Array(
      atob(encryptedData).split('').map(char => char.charCodeAt(0))
    );

    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);

    // Import the decryption key
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)),
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    // Decrypt the data
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      encrypted
    );

    // Return decrypted text
    return new TextDecoder().decode(decrypted);
  } catch (error) {
    // In case of decryption failure, return empty string to prevent data exposure
    console.error('PHI decryption failed');
    return '';
  }
}

/**
 * List of PHI fields that require encryption
 */
export const PHI_FIELDS = [
  'social_security_number',
  'email',
  'phone',
  'address',
  'emergency_contact',
  'insurance_info',
  'notes'
] as const;

/**
 * Encrypts PHI fields in a patient object
 * @param patient - Patient data object
 * @returns Patient object with encrypted PHI fields
 */
export async function encryptPatientPHI(patient: Record<string, any>): Promise<Record<string, any>> {
  const encrypted = { ...patient };
  
  for (const field of PHI_FIELDS) {
    if (encrypted[field] && typeof encrypted[field] === 'string') {
      encrypted[field] = await encryptPHI(encrypted[field]);
    }
  }
  
  return encrypted;
}

/**
 * Decrypts PHI fields in a patient object
 * @param patient - Patient data object with encrypted PHI fields
 * @returns Patient object with decrypted PHI fields
 */
export async function decryptPatientPHI(patient: Record<string, any>): Promise<Record<string, any>> {
  const decrypted = { ...patient };
  
  for (const field of PHI_FIELDS) {
    if (decrypted[field] && typeof decrypted[field] === 'string') {
      decrypted[field] = await decryptPHI(decrypted[field]);
    }
  }
  
  return decrypted;
}

/**
 * Checks if a string appears to be encrypted (base64 format)
 * @param value - String to check
 * @returns True if the string appears to be encrypted
 */
export function isEncrypted(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  
  // Check if it's valid base64 and has reasonable length for encrypted data
  try {
    return btoa(atob(value)) === value && value.length > 20;
  } catch {
    return false;
  }
}

/**
 * Redacts sensitive information for logging purposes
 * @param data - Object containing potentially sensitive data
 * @returns Object with sensitive fields redacted
 */
export function redactPHI(data: Record<string, any>): Record<string, any> {
  const redacted = { ...data };
  
  for (const field of PHI_FIELDS) {
    if (redacted[field]) {
      redacted[field] = '[REDACTED]';
    }
  }
  
  return redacted;
}
