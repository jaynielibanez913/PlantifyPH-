import { NextResponse } from 'next/server';
import { getAdminDashboardSummary } from '@/features/admin/service';
import { requireAdminUser } from '@/lib/auth/session';
import { handleRouteError } from '@/lib/errors/app-error';

export async function GET() {
  try {
    await requireAdminUser();
    const summary = getAdminDashboardSummary();
    return NextResponse.json(summary, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}
