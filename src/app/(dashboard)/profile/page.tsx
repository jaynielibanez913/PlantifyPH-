import { getCurrentUser } from '@/lib/auth/session';
import { ProfileClient } from '@/features/users/ProfileClient';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const user = await getCurrentUser();
  return <ProfileClient initialUser={user} />;
}
