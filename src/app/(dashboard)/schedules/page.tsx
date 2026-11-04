import { getCurrentUser } from '@/lib/auth/session';
import { listUserPlants } from '@/features/my-plants/service';
import { listWateringSchedules } from '@/features/watering/service';
import { listReminders } from '@/features/reminders/service';
import { SchedulesClient } from '@/features/watering/SchedulesClient';

export const dynamic = 'force-dynamic';

export default async function SchedulesPage() {
  const user = await getCurrentUser();
  const ownedPlants = user ? listUserPlants(user.id) : null;
  const schedules = user ? listWateringSchedules(user.id) : null;
  const reminders = user ? listReminders(user.id) : null;

  return (
    <SchedulesClient
      initialUser={user}
      initialOwnedPlants={ownedPlants}
      initialSchedules={schedules}
      initialReminders={reminders}
    />
  );
}
