'use server';

import { sqliteService } from '@/lib/services/sqlite.service';

/**
 * 确保SQLite数据库已连接
 */
async function ensureSQLiteConnection() {
  if (!sqliteService.isDbConnected()) {
    await sqliteService.connect();
  }
}

/**
 * Watchlist信息接口
 */
export interface WatchlistInfo {
  id: number;
  name: string;
  symbolCount: number;
  category?: string;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  symbols: string[];
}

/**
 * Watchlist详情接口
 */
export interface WatchlistDetail {
  id: number;
  name: string;
  description?: string;
  symbols: Array<{ symbol: string; company: string }>;
  category?: string;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * 获取所有系统Watchlist (SQLite版本)
 * 用于多股同列和heatmap功能
 */
export async function getAllSystemWatchlists(
  activeOnly: boolean = true
): Promise<WatchlistInfo[]> {
  try {
    await ensureSQLiteConnection();

    const result = await sqliteService.getWatchlists(activeOnly, true);

    if (!result.success || !result.data) {
      console.error('getAllSystemWatchlists error:', result.error);
      return [];
    }

    return result.data.map(watchlist => {
      // 解析JSON格式的symbols字段
      let symbols: string[] = [];
      if (watchlist.symbols && typeof watchlist.symbols === 'string') {
        try {
          symbols = JSON.parse(watchlist.symbols);
        } catch (error) {
          console.warn(`[getAllSystemWatchlists] 解析watchlist ${watchlist.id} 的symbols失败:`, error);
          symbols = [];
        }
      } else if (Array.isArray(watchlist.symbols)) {
        symbols = watchlist.symbols;
      }

      return {
        id: watchlist.id,
        name: watchlist.name,
        symbolCount: symbols.length,
        category: watchlist.category,
        is_system: watchlist.is_system,
        is_active: watchlist.is_active,
        created_at: new Date(watchlist.created_at * 1000).toISOString(),
        updated_at: new Date(watchlist.updated_at * 1000).toISOString(),
        symbols: symbols
      };
    });
  } catch (error) {
    console.error('getAllSystemWatchlists error:', error);
    return [];
  }
}

/**
 * 根据ID获取特定Watchlist详情 (SQLite版本)
 */
export async function getWatchlistById(
  watchlistId: number
): Promise<WatchlistDetail | null> {
  try {
    await ensureSQLiteConnection();
    const result = await sqliteService.query(
      'SELECT * FROM watchlists WHERE id = ? AND is_active = 1',
      [watchlistId]
    );

    if (!result.rows || result.rows.length === 0) {
      console.error(`[getWatchlistById] Watchlist not found: ${watchlistId}`);
      return null;
    }

    const watchlist = result.rows[0];
    const symbols = JSON.parse(watchlist.symbols || '[]');

    // 移除交易所前缀的函数
    const removeExchangePrefix = (symbol: string): string => {
      if (symbol.includes(':')) {
        return symbol.split(':')[1];
      }
      return symbol;
    };

    return {
      id: watchlist.id,
      name: watchlist.name,
      description: watchlist.description,
      symbols: symbols.map((symbol: string) => ({
        symbol: removeExchangePrefix(symbol),
        company: removeExchangePrefix(symbol), // TODO: 从其他数据源获取完整公司名称
      })),
      category: watchlist.category,
      is_system: !!watchlist.is_system,
      created_at: new Date(watchlist.created_at * 1000).toISOString(),
      updated_at: new Date(watchlist.updated_at * 1000).toISOString(),
    };
  } catch (error) {
    console.error('getWatchlistById error:', error);
    return null;
  }
}

/**
 * 获取Watchlist的股票符号列表 (SQLite版本)
 */
export async function getWatchlistSymbols(
  watchlistId: number
): Promise<Array<{ symbol: string; company: string }>> {
  try {
    const watchlist = await getWatchlistById(watchlistId);

    if (!watchlist) {
      console.error(`[getWatchlistSymbols] Watchlist not found: ${watchlistId}`);
      return [];
    }

    console.log(`[getWatchlistSymbols] Loaded ${watchlist.symbols.length} symbols from "${watchlist.name}"`);
    return watchlist.symbols;
  } catch (error) {
    console.error('getWatchlistSymbols error:', error);
    return [];
  }
}

/**
 * 创建新的系统Watchlist (SQLite版本)
 */
export async function createSystemWatchlist(
  name: string,
  symbols: string[],
  options?: {
    description?: string;
    category?: string;
  }
): Promise<{ success: boolean; watchlistId?: number; message: string }> {
  try {
    await ensureSQLiteConnection();
    // 获取当前最大sort_order
    const maxOrderResult = await sqliteService.query(
      'SELECT MAX(sort_order) as max_order FROM watchlists'
    );

    const maxOrder = maxOrderResult.data?.[0]?.max_order || 0;

    const watchlist = {
      name,
      description: options?.description,
      symbols: symbols.map(s => s.toUpperCase()),
      category: options?.category,
      is_system: true,
      is_active: true,
      sort_order: maxOrder + 1,
    };

    const result = await sqliteService.upsertWatchlist(watchlist);

    if (!result.success) {
      return { success: false, message: result.error || '创建失败' };
    }

    // 获取新创建的watchlist ID
    const newWatchlistResult = await sqliteService.query(
      'SELECT id FROM watchlists WHERE name = ? ORDER BY created_at DESC LIMIT 1',
      [name]
    );

    const watchlistId = newWatchlistResult.data?.[0]?.id;

    return {
      success: true,
      watchlistId,
      message: `成功创建Watchlist "${name}"，包含 ${symbols.length} 只股票`
    };
  } catch (error) {
    console.error('createSystemWatchlist error:', error);
    return { success: false, message: String(error) };
  }
}

/**
 * 更新系统Watchlist (SQLite版本)
 */
export async function updateSystemWatchlist(
  watchlistId: number,
  updates: {
    name?: string;
    symbols?: string[];
    description?: string;
    category?: string;
    is_active?: boolean;
  }
): Promise<{ success: boolean; message: string }> {
  try {
    // 先获取现有数据
    const existing = await getWatchlistById(watchlistId);
    if (!existing) {
      return { success: false, message: 'Watchlist不存在' };
    }

    // 合并更新数据
    const updatedWatchlist = {
      id: watchlistId,
      name: updates.name || existing.name,
      description: updates.description !== undefined ? updates.description : existing.description,
      symbols: updates.symbols || existing.symbols.map(s => s.symbol),
      category: updates.category !== undefined ? updates.category : existing.category,
      is_system: existing.is_system,
      is_active: updates.is_active !== undefined ? updates.is_active : existing.is_active,
      sort_order: 0, // 保持原有排序
    };

    const result = await sqliteService.upsertWatchlist(updatedWatchlist);

    if (!result.success) {
      return { success: false, message: result.error || '更新失败' };
    }

    return { success: true, message: '更新成功' };
  } catch (error) {
    console.error('updateSystemWatchlist error:', error);
    return { success: false, message: String(error) };
  }
}

/**
 * 删除系统Watchlist (SQLite版本)
 * 实际上是设置为is_active = false，而不是真正删除
 */
export async function deleteSystemWatchlist(
  watchlistId: number
): Promise<{ success: boolean; message: string }> {
  try {
    const result = await sqliteService.execute(
      'UPDATE watchlists SET is_active = 0, updated_at = strftime("%s", "now") WHERE id = ?',
      [watchlistId]
    );

    if (!result.success) {
      return { success: false, message: result.error || '删除失败' };
    }

    return { success: true, message: 'Watchlist已删除' };
  } catch (error) {
    console.error('deleteSystemWatchlist error:', error);
    return { success: false, message: String(error) };
  }
}

/**
 * 获取Watchlist统计信息
 */
export async function getWatchlistStats(): Promise<{
  totalWatchlists: number;
  activeWatchlists: number;
  totalSymbols: number;
  categories: Array<{ category: string; count: number }>;
}> {
  try {
    // 基本统计
    const basicStats = await sqliteService.query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active
      FROM watchlists WHERE is_system = 1
    `);

    // 符号统计
    const symbolsResult = await sqliteService.query(`
      SELECT SUM(JSON_ARRAY_LENGTH(symbols)) as total_symbols
      FROM watchlists
      WHERE is_system = 1 AND is_active = 1 AND symbols IS NOT NULL
    `);

    // 分类统计
    const categoryResult = await sqliteService.query(`
      SELECT category, COUNT(*) as count
      FROM watchlists
      WHERE is_system = 1 AND is_active = 1 AND category IS NOT NULL AND category != ''
      GROUP BY category
      ORDER BY count DESC
    `);

    const totalWatchlists = basicStats.data?.[0]?.total || 0;
    const activeWatchlists = basicStats.data?.[0]?.active || 0;
    const totalSymbols = symbolsResult.data?.[0]?.total_symbols || 0;
    const categories = categoryResult.data || [];

    return {
      totalWatchlists,
      activeWatchlists,
      totalSymbols,
      categories: categories.map((cat: any) => ({
        category: cat.category,
        count: cat.count
      }))
    };
  } catch (error) {
    console.error('getWatchlistStats error:', error);
    return {
      totalWatchlists: 0,
      activeWatchlists: 0,
      totalSymbols: 0,
      categories: []
    };
  }
}

/**
 * 搜索Watchlist (SQLite版本)
 */
export async function searchWatchlists(
  query: string,
  activeOnly: boolean = true
): Promise<WatchlistInfo[]> {
  try {
    const result = await sqliteService.query(`
      SELECT * FROM watchlists
      WHERE is_system = 1
      ${activeOnly ? 'AND is_active = 1' : ''}
      AND (name LIKE ? OR description LIKE ? OR category LIKE ?)
      ORDER BY sort_order, name
    `, [`%${query}%`, `%${query}%`, `%${query}%`]);

    if (!result.success || !result.data) {
      return [];
    }

    return result.data.map((watchlist: any) => {
      const symbols = JSON.parse(watchlist.symbols || '[]');
      return {
        id: watchlist.id,
        name: watchlist.name,
        symbolCount: symbols.length,
        category: watchlist.category,
        is_system: !!watchlist.is_system,
        is_active: !!watchlist.is_active,
        created_at: new Date(watchlist.created_at * 1000).toISOString(),
        updated_at: new Date(watchlist.updated_at * 1000).toISOString(),
      };
    });
  } catch (error) {
    console.error('searchWatchlists error:', error);
    return [];
  }
}