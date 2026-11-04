import { NextResponse } from 'next/server';
import { getUserDashboardSummary } from '@/features/dashboard/service';
import { requireAuthenticatedUser } from '@/lib/auth/session';
import { handleRouteError } from '@/lib/errors/app-error';

export async function GET() {
  try {
    const user = await requireAuthenticatedUser();
    const summary = getUserDashboardSummary(user.id);
    return NextResponse.json(summary, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}
