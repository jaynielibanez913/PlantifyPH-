import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { NotFoundError, ValidationError } from '@/lib/errors/app-error';

const UPLOAD_DIR = path.join(os.tmpdir(), 'plantifyph-uploads');
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

const EXT_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};

const SAFE_FILENAME_REGEX = /^[a-f0-9-]{36}\.(jpg|png|webp|gif)$/;

function ensureUploadDir(): void {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

function detectImageExtension(buffer: Buffer): 'jpg' | 'png' | 'webp' | 'gif' | null {
  if (buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'png';
  }

  // GIF: GIF87a or GIF89a
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) &&
    buffer[5] === 0x61
  ) {
    return 'gif';
  }

  // WebP: RIFF....WEBP
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'webp';
  }

  return null;
}

export interface StoredUploadResult {
  url: string;
  filename: string;
  mimeType: string;
  size: number;
}

export function saveUploadedImageBuffer(buffer: Buffer): StoredUploadResult {
  if (!buffer || buffer.length === 0) {
    throw new ValidationError('Uploaded image file is empty.');
  }

  if (buffer.length > MAX_UPLOAD_BYTES) {
    throw new ValidationError('Photo must be 5 MB or smaller.');
  }

  const ext = detectImageExtension(buffer);
  if (!ext) {
    throw new ValidationError(
      'Unsupported file format. Please upload a JPG, PNG, WebP, or GIF image.'
    );
  }

  ensureUploadDir();
  const filename = `${randomUUID()}.${ext}`;
  const targetPath = path.join(UPLOAD_DIR, filename);
  const tempPath = `${targetPath}.${process.pid}.tmp`;

  fs.writeFileSync(tempPath, buffer);
  fs.renameSync(tempPath, targetPath);

  return {
    url: `/api/uploads/${filename}`,
    filename,
    mimeType: EXT_TO_MIME[ext],
    size: buffer.length,
  };
}

export function readUploadedImage(filename: string): {
  buffer: Buffer;
  mimeType: string;
} {
  if (!SAFE_FILENAME_REGEX.test(filename)) {
    throw new NotFoundError('Uploaded image not found.');
  }

  const ext = filename.split('.').pop() ?? '';
  const mimeType = EXT_TO_MIME[ext];
  if (!mimeType) {
    throw new NotFoundError('Uploaded image not found.');
  }

  const targetPath = path.join(UPLOAD_DIR, filename);
  if (!fs.existsSync(targetPath)) {
    throw new NotFoundError('Uploaded image not found.');
  }

  return {
    buffer: fs.readFileSync(targetPath),
    mimeType,
  };
}
