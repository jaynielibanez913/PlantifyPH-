import { getCurrentUser } from '@/lib/auth/session';
import { listUserPlants } from '@/features/my-plants/service';
import { listPlants } from '@/features/plants/service';
import { MyPlantsClient } from '@/features/my-plants/MyPlantsClient';

export const dynamic = 'force-dynamic';

export default async function MyPlantsPage() {
  const user = await getCurrentUser();
  const ownedPlants = user ? listUserPlants(user.id) : null;
  const catalog = listPlants({ limit: 50 });

  return (
    <MyPlantsClient
      initialUser={user}
      initialOwnedPlants={ownedPlants}
      catalogPlants={catalog.items}
    />
  );
}
