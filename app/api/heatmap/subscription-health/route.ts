/**
 * 订阅健康检查 API
 * 用于监控和调试：查看哪些股票正常接收推送，哪些没有
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/better-auth/auth';
import SSEManager from '@/lib/tradingview/sse-manager';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // 验证用户登录
    const session = await auth.api.getSession({ headers: request.headers });
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 获取订阅健康状态
    const health = SSEManager.getSubscriptionHealth();
    const stats = SSEManager.getStats();

    if (!health) {
      return NextResponse.json({
        success: false,
        error: 'Ticker not running',
        stats,
      });
    }

    // 计算健康分数 (0-100)
    const healthScore = health.totalSymbols > 0
      ? Math.round((health.activeSymbols / health.totalSymbols) * 100)
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        healthScore,
        totalSymbols: health.totalSymbols,
        activeSymbols: health.activeSymbols,
        staleSymbolsCount: health.staleSymbols.length,
        neverUpdatedSymbolsCount: health.neverUpdatedSymbols.length,
        staleSymbols: health.staleSymbols,
        neverUpdatedSymbols: health.neverUpdatedSymbols,
        connectedClients: stats.clientCount,
        isTickerRunning: stats.isTickerRunning,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[Subscription Health API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

