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

export async function testTursoConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const client = getTursoClient();
    const result = await client.execute('SELECT 1 as connected');
    if (result.rows.length > 0) {
      return { success: true, message: 'Successfully connected to Turso database (libsql).' };
    }
    return { success: false, message: 'Turso query returned empty response.' };
  } catch (err: any) {
    const msg = err?.message || String(err);
    console.warn('[Turso] Connection test note:', msg);
    return { success: false, message: msg };
  }
}
