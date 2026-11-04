import { createClient, Client } from '@libsql/client';

const TURSO_URL =
  process.env.TURSO_DATABASE_URL ||
  'libsql://plantifyph-jay913.aws-ap-southeast-1.turso.io';

const TURSO_TOKEN =
  process.env.TURSO_AUTH_TOKEN ||
  'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicm8iLCJpYXQiOjE3OTM3NTk4NTcsImlkIjoiMDFhMWE0NjctNjEwMS03ZjM5LWJlZWItNDg1ZWRlNGNhMWRhIiwia2lkIjoiZUhaMnZvV0M0ekY0ZUowLVIwV0o1eC12djIxMUs2OFB3VlBEdDk2SmtURSIsInJpZCI6ImRmZjUxZjZmLTgxNzctNDZkNi05ZmViLWRjOWE4ZDJjOGVkOCJ9.4KnltWSycU6ZPSdU9hWDMebD6vefquzsE6g92ljLDMjtzoJ8yujymOnwjR-phM1rD_KXt7BX2x5WcetogBEzAw';

export function getTursoClient(): Client {
  return createClient({
    url: TURSO_URL,
    authToken: TURSO_TOKEN,
  });
}

export const tursoClient = getTursoClient();

export async function testTursoConnection(): Promise<{
  success: boolean;
  message: string;
  isReadOnly?: boolean;
}> {
  try {
    const client = getTursoClient();
    const result = await client.execute('SELECT 1 as connected');
    if (result.rows.length > 0) {
      // Check if token has read-only payload
      let isReadOnly = false;
      try {
        const parts = TURSO_TOKEN.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
          if (payload?.a === 'ro') {
            isReadOnly = true;
          }
        }
      } catch (e) {
        // ignore payload parsing error
      }

      if (isReadOnly) {
        return {
          success: true,
          isReadOnly: true,
          message:
            'Connected to Turso, but the provided token is READ-ONLY ("ro"). Write operations (INSERT/CREATE TABLE) require a Read-Write token.',
        };
      }

      return {
        success: true,
        isReadOnly: false,
        message: 'Successfully connected to Turso database with write permissions.',
      };
    }
    return { success: false, message: 'Turso query returned empty response.' };
  } catch (err: any) {
    const msg = err?.message || String(err);
    console.warn('[Turso] Connection test note:', msg);
    return { success: false, message: msg };
  }
}
