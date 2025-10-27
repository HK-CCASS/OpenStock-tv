/**
 * 手动触发订阅修复 API
 * 强制重新订阅未接收更新的股票
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/better-auth/auth';
import SSEManager from '@/lib/tradingview/sse-manager';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // 验证用户登录
    const session = await auth.api.getSession({ headers: request.headers });
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 获取订阅健康状态（修复前）
    const healthBefore = SSEManager.getSubscriptionHealth();

    if (!healthBefore) {
      return NextResponse.json({
        success: false,
        error: 'Ticker not running',
      });
    }

    // 执行自动修复
    const ticker = (SSEManager as any).ticker;
    let repairedCount = 0;

    if (ticker && 'autoRepairSubscriptions' in ticker) {
      repairedCount = ticker.autoRepairSubscriptions();
    }

    // 等待1秒，让修复生效
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 获取修复后的健康状态
    const healthAfter = SSEManager.getSubscriptionHealth();

    return NextResponse.json({
      success: true,
      data: {
        repairedCount,
        before: {
          totalSymbols: healthBefore.totalSymbols,
          activeSymbols: healthBefore.activeSymbols,
          neverUpdatedCount: healthBefore.neverUpdatedSymbols.length,
          staleCount: healthBefore.staleSymbols.length,
        },
        after: {
          totalSymbols: healthAfter?.totalSymbols || 0,
          activeSymbols: healthAfter?.activeSymbols || 0,
          neverUpdatedCount: healthAfter?.neverUpdatedSymbols.length || 0,
          staleCount: healthAfter?.staleSymbols.length || 0,
        },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[Repair Subscriptions API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

