/**
 * 热力图初始数据 API
 * 返回用户观察列表分组、市值基准和初始报价
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/better-auth/auth';
import { getUserHeatmapData, getInitialQuotes } from '@/lib/actions/heatmap.actions';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // 1. 验证用户登录
    const session = await auth.api.getSession({ headers: request.headers });
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. 获取用户的观察列表分组
    const { pools } = await getUserHeatmapData(session.user.id);

    if (pools.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          pools: [],
          allCells: [],
        },
      });
    }

    // 3. 提取所有股票代码
    const allSymbols = pools.flatMap((p) => p.symbols.map((s) => s.symbol));

    // 4. 获取初始报价和市值（作为基准）
    const quotesMap = await getInitialQuotes(allSymbols);

    // 5. 构造返回数据
    const poolsData = pools.map((pool) => {
      const cells = pool.symbols.map((stock) => {
        const quote = quotesMap.get(stock.symbol) || {
          price: 0,
          change: 0,
          changePercent: 0,
          volume: 0,
          marketCap: 0,
        };

        return {
          symbol: stock.symbol,
          name: stock.company,
          last: quote.price,        // 基准价格
          change: quote.change,     // 初始变动（SSE 会更新）
          changePercent: quote.changePercent, // 初始涨跌幅（SSE 会更新）
          volume: quote.volume,     // 初始成交量（SSE 会更新）
          marketCap: quote.marketCap, // 市值基准
          category: pool.poolName,
          pools: [pool.poolName],
        };
      });

      // 计算池子统计数据
      const totalMarketCap = cells.reduce((sum, c) => sum + c.marketCap, 0);
      const avgChangePercent = cells.length > 0
        ? cells.reduce((sum, c) => sum + c.changePercent, 0) / cells.length
        : 0;

      return {
        poolName: pool.poolName,
        stockCount: cells.length,
        avgChangePercent,
        totalMarketCap,
        cells,
      };
    });

    // 6. 生成扁平化的所有股票列表
    const allCells = poolsData.flatMap((p) => p.cells);

    return NextResponse.json({
      success: true,
      data: {
        pools: poolsData,
        allCells,
      },
    });
  } catch (error) {
    console.error('Heatmap user-data API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        data: { pools: [], allCells: [] },
      },
      { status: 500 }
    );
  }
}

