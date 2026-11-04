import { getCurrentUser } from '@/lib/auth/session';
import { getUserDashboardSummary } from '@/features/dashboard/service';
import { DashboardClient } from '@/features/dashboard/DashboardClient';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const summary = user ? getUserDashboardSummary(user.id) : null;

  return <DashboardClient initialUser={user} initialSummary={summary} />;
}
