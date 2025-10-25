'use server';

import { getAllSystemWatchlists } from '@/lib/actions/watchlist-sqlite.actions';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

/**
 * Stock quote interface for multi-stock view
 * Data will be fetched client-side from TradingView widgets
 */
export interface StockQuote {
  symbol: string;
  company: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  timestamp: number;
}

/**
 * Watchlist with metadata
 */
export interface WatchlistInfo {
  id: string;
  name: string;
  symbolCount: number;
  createdAt: string;
}

/**
 * Get all system watchlists from SQLite (统一数据源)
 */
export async function getUserWatchlists(
  userId: string = 'local-user'
): Promise<WatchlistInfo[]> {
  try {
    // 从SQLite数据库获取系统Watchlist
    const watchlists = await getAllSystemWatchlists(true);

    return watchlists.map(watchlist => ({
      id: watchlist.id.toString(),
      name: `${watchlist.name} (${watchlist.symbolCount})`,
      symbolCount: watchlist.symbolCount,
      createdAt: watchlist.created_at,
    }));
  } catch (error) {
    console.error('getUserWatchlists error:', error);
    return [];
  }
}

/**
 * Get watchlist symbols (stocks) - 从 SQLite 读取
 * ✅ 所有模块使用SQLite数据源
 */
export async function getWatchlistSymbols(
  watchlistId: string,
  userId: string = 'local-user'
): Promise<Array<{ symbol: string; company: string }>> {
  try {
    // ✅ 从 SQLite 获取Watchlist详情
    const { getWatchlistDetail } = await import('@/lib/actions/watchlist-sqlite.actions');
    const watchlist = await getWatchlistDetail(parseInt(watchlistId));

    if (!watchlist) {
      console.error(`[getWatchlistSymbols] Watchlist not found: ${watchlistId}`);
      return [];
    }

    console.log(`[getWatchlistSymbols] Loaded ${watchlist.symbols.length} symbols from "${watchlist.name}"`);
    return watchlist.symbols.map(symbol => ({
      symbol: symbol,
      company: symbol // SQLite中目前只存储symbol，company作为占位符
    }));
  } catch (error) {
    console.error('getWatchlistSymbols error:', error);
    return [];
  }
}

/**
 * Add symbol to user watchlist (SQLite)
 * 注意：此功能现在操作用户自定义watchlist表
 */
export async function addToWatchlist(
  symbol: string,
  company: string,
  userId: string = 'local-user'
): Promise<{ success: boolean; message: string }> {
  try {
    // ✅ 使用SQLite用户watchlist功能
    const { addSymbolsToUserWatchlist } = await import('@/lib/actions/watchlist-sqlite.actions');

    // 创建或获取用户默认watchlist
    const watchlistName = `${userId}_personal`;
    const result = await addSymbolsToUserWatchlist(userId, watchlistName, [symbol], {
      description: '个人自选股列表'
    });

    if (result.success) {
      return { success: true, message: '添加成功' };
    } else {
      return { success: false, message: result.message || '添加失败' };
    }
  } catch (error) {
    console.error('addToWatchlist error:', error);
    return { success: false, message: '添加失败' };
  }
}

/**
 * Remove symbol from user watchlist (SQLite)
 */
export async function removeFromWatchlist(
  symbol: string,
  userId: string = 'local-user'
): Promise<{ success: boolean; message: string }> {
  try {
    // ✅ 使用SQLite用户watchlist功能
    const { removeSymbolsFromUserWatchlist } = await import('@/lib/actions/watchlist-sqlite.actions');

    const watchlistName = `${userId}_personal`;
    const result = await removeSymbolsFromUserWatchlist(userId, watchlistName, [symbol]);

    if (result.success) {
      return { success: true, message: '移除成功' };
    } else {
      return { success: false, message: result.message || '移除失败' };
    }
  } catch (error) {
    console.error('removeFromWatchlist error:', error);
    return { success: false, message: '移除失败' };
  }
}
