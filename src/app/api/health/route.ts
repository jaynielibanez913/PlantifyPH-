import { NextResponse } from 'next/server';
import { testTursoConnection } from '@/lib/turso/client';
import { testFirestoreConnection } from '@/lib/store/firestore-store';

export async function GET() {
  const [firestoreOk, tursoResult] = await Promise.all([
    testFirestoreConnection(),
    testTursoConnection(),
  ]);

  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    databases: {
      firestore: {
        connected: firestoreOk,
        databaseId: 'ai-studio-plantifyph-3d16d4ff-54d0-46f5-b970-243366f81351',
      },
      turso: {
        connected: tursoResult.success,
        url: 'libsql://plantifyph-jay913.aws-ap-southeast-1.turso.io',
        message: tursoResult.message,
      },
    },
  });
}
