import { auth } from '@/lib/better-auth/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getWatchlistGroupsByUser, getWatchlistGroupDetail } from '@/lib/actions/watchlist-group.actions';
import { adaptWatchlistGroupsToModuleFormat, adaptSymbolsForModule } from '@/lib/adapters/multi-stock-adapter';
import StockGridController from '@/components/multi-stock/StockGridController';

export default async function MultiStockPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    redirect('/sign-in');
  }

  const userId = session.user.id;

  // 获取用户的所有watchlist groups
  const watchlistGroups = await getWatchlistGroupsByUser(userId);

  if (watchlistGroups.length === 0) {
    return (
      <div className="py-8">
        <div className="text-center py-12">
          <h1 className="text-3xl font-bold mb-4">多股同列</h1>
          <p className="text-gray-400 mb-6">您还没有创建任何自选列表</p>
          <p className="text-sm text-gray-500">
            请先添加股票到自选列表，然后再使用此功能
          </p>
        </div>
      </div>
    );
  }

  // 默认显示第一个watchlist
  const defaultGroup = watchlistGroups[0];
  const groupDetail = await getWatchlistGroupDetail(userId, defaultGroup.id);

  if (!groupDetail) {
    return (
      <div className="py-8">
        <div className="text-center py-12">
          <h1 className="text-3xl font-bold mb-4">多股同列</h1>
          <p className="text-gray-400">无法加载自选列表数据</p>
        </div>
      </div>
    );
  }

  // 转换数据格式
  const watchlistsForModule = adaptWatchlistGroupsToModuleFormat(watchlistGroups);
  const symbolsForModule = adaptSymbolsForModule(groupDetail.symbols);

  return (
    <div className="py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">多股同列</h1>
        <p className="text-muted-foreground">
          实时监控多支股票，支持灵活布局和智能排序
        </p>
      </div>

      <StockGridController
        symbols={symbolsForModule}
        watchlists={watchlistsForModule}
        currentWatchlistId="1"
        userId={userId}
      />
    </div>
  );
}

