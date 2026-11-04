import { getCurrentUser } from '@/lib/auth/session';
import {
  getAdminDashboardSummary,
  listAllArticlesForAdmin,
  listAllUsersForAdmin,
} from '@/features/admin/service';
import { listPlantCategories, listPlants } from '@/features/plants/service';
import { listArticleCategories } from '@/features/articles/service';
import { AdminConsoleClient } from '@/features/admin/AdminConsoleClient';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const user = await getCurrentUser();
  const isAdmin = user?.role === 'ADMIN';

  const summary = isAdmin ? getAdminDashboardSummary() : null;
  const users = isAdmin ? listAllUsersForAdmin() : null;
  const catalog = listPlants({ limit: 50 });
  const plantCategories = listPlantCategories();
  const articles = isAdmin ? listAllArticlesForAdmin() : null;
  const articleCategories = listArticleCategories();

  return (
    <AdminConsoleClient
      initialUser={user}
      initialSummary={summary}
      initialUsers={users}
      initialPlants={catalog.items}
      plantCategories={plantCategories}
      initialArticles={articles}
      articleCategories={articleCategories}
    />
  );
}
