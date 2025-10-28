import { auth } from '@/lib/better-auth/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getWatchlistGroupsByUser, getWatchlistGroupDetail } from '@/lib/actions/watchlist-group.actions';
import { adaptWatchlistGroupsToModuleFormat, adaptSymbolsForModule, findModuleIdByGroupId } from '@/lib/adapters/multi-stock-adapter';
import StockGridController from '@/components/multi-stock/StockGridController';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MultiStockDetailPage({ params }: PageProps) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    redirect('/sign-in');
  }

  const { id } = await params;
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

  // 转换为模块格式
  const watchlistsForModule = adaptWatchlistGroupsToModuleFormat(watchlistGroups);

  // 查找对应的watchlist group
  // id可能是模块ID（数字字符串）或MongoDB groupId
  let targetGroupId: string;
  const numericId = parseInt(id, 10);

  if (!isNaN(numericId) && numericId >= 1 && numericId <= watchlistGroups.length) {
    // 如果是有效的模块ID（1-based索引），转换为MongoDB groupId
    targetGroupId = watchlistGroups[numericId - 1].id;
  } else {
    // 否则假设是MongoDB groupId
    targetGroupId = id;
  }

  // 获取watchlist详情
  const groupDetail = await getWatchlistGroupDetail(userId, targetGroupId);

  if (!groupDetail) {
    return (
      <div className="py-8">
        <div className="text-center py-12">
          <h1 className="text-3xl font-bold mb-4">多股同列</h1>
          <p className="text-gray-400 mb-6">找不到指定的自选列表</p>
          <p className="text-sm text-gray-500">
            该自选列表可能已被删除或您没有访问权限
          </p>
        </div>
      </div>
    );
  }

  // 转换数据格式
  const symbolsForModule = adaptSymbolsForModule(groupDetail.symbols);
  const moduleId = findModuleIdByGroupId(watchlistGroups, targetGroupId);

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
        currentWatchlistId={moduleId}
        userId={userId}
      />
    </div>
  );
}

