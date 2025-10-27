/**
 * SSE API Route - 实时推送股票报价
 * 连接到 TradingView WebSocket 并通过 SSE 推送更新到前端
 */

import { NextRequest } from 'next/server';
import { auth } from '@/lib/better-auth/auth';
import { getWatchlistWithDetails } from '@/lib/actions/watchlist.actions';
import SSEManager from '@/lib/tradingview/sse-manager';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // 1. 验证用户登录
    const session = await auth.api.getSession({ headers: request.headers });
    
    if (!session?.user?.id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 2. 获取用户的观察列表股票
    const watchlist = await getWatchlistWithDetails(session.user.id);
    
    if (watchlist.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No watchlist symbols found' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 3. 提取所有股票代码
    const symbols = watchlist.map(item => item.symbol);
    const clientId = `${session.user.id}-${Date.now()}`;

    // 性能优化：移除客户端连接日志

    // 4. 创建 SSE 流
    const stream = new ReadableStream({
      start(controller) {
        // 订阅客户端到 SSE Manager
        SSEManager.subscribeClient(clientId, symbols, controller);

        // 发送连接成功消息
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected', clientId })}\n\n`));

        // 延迟发送初始状态（等待 TradingView 连接）
        setTimeout(() => {
          SSEManager.sendInitialStates(clientId);
        }, 2000);
      },
      cancel() {
        // 客户端断开连接时清理
        // 性能优化：移除断开连接日志
        SSEManager.unsubscribeClient(clientId);
      },
    });

    // 5. 返回 SSE 响应
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // 禁用 Nginx 缓冲
      },
    });
  } catch (error) {
    console.error('[SSE API] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

