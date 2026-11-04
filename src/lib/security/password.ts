import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const KEY_LENGTH = 64;

export function hashPassword(plainPassword: string): string {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = scryptSync(plainPassword, salt, KEY_LENGTH).toString('hex');
  return `${salt}:${derivedKey}`;
}

export function verifyPassword(plainPassword: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) {
    return false;
  }
  const [salt, keyHex] = parts;
  const keyBuffer = Buffer.from(keyHex, 'hex');
  const derivedBuffer = scryptSync(plainPassword, salt, KEY_LENGTH);

  if (keyBuffer.length !== derivedBuffer.length) {
    return false;
  }
  return timingSafeEqual(keyBuffer, derivedBuffer);
}
