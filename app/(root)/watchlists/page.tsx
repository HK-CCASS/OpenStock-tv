import { auth } from '@/lib/better-auth/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getWatchlistGroupsByUser } from '@/lib/actions/watchlist-group.actions';
import WatchlistGroupManager from '@/components/watchlist/WatchlistGroupManager';

export default async function WatchlistsPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    redirect('/sign-in');
  }

  const userId = session.user.id;
  const watchlistGroups = await getWatchlistGroupsByUser(userId);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">自选列表管理</h1>
        <p className="text-muted-foreground">
          创建和管理您的自选列表分组
        </p>
      </div>

      <WatchlistGroupManager 
        initialGroups={watchlistGroups}
        userId={userId}
      />
    </div>
  );
}

