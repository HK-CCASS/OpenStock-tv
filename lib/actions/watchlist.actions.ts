'use server';

import { connectToDatabase } from '@/database/mongoose';
import { Watchlist } from '@/database/models/watchlist.model';
import { getOrCreateDefaultGroup } from './watchlist-group.actions';
import { getMarketCapCache } from './heatmap.actions';

export async function getWatchlistSymbolsByEmail(email: string): Promise<string[]> {
    if (!email) return [];

    try {
        const mongoose = await connectToDatabase();
        const db = mongoose.connection.db;
        if (!db) throw new Error('MongoDB connection not found');

        // Better Auth stores users in the "user" collection
        const user = await db.collection('user').findOne<{ _id?: unknown; id?: string; email?: string }>({ email });

        if (!user) return [];

        const userId = (user.id as string) || String(user._id || '');
        if (!userId) return [];

        const items = await Watchlist.find({ userId }, { symbol: 1 }).lean();
        return items.map((i) => String(i.symbol));
    } catch (err) {
        console.error('getWatchlistSymbolsByEmail error:', err);
        return [];
    }
}

/**
 * 添加股票到自选列表（并立即预缓存市值）
 * @param userId - 用户ID
 * @param symbol - 股票代码
 * @param company - 公司名称
 * @param groupId - 可选的分组ID，如果不提供则使用默认分组
 */
export async function addToWatchlist(
    userId: string,
    symbol: string,
    company: string,
    groupId?: string
): Promise<{ success: boolean; error?: string }> {
    if (!userId || !symbol || !company) {
        return { success: false, error: 'userId, symbol, and company are required' };
    }

    try {
        await connectToDatabase();

        // 1️⃣ 如果没有提供 groupId，获取或创建默认分组
        let targetGroupId = groupId;
        if (!targetGroupId) {
            targetGroupId = await getOrCreateDefaultGroup(userId);
            if (!targetGroupId) {
                return { success: false, error: 'Failed to create default group' };
            }
        }

        // 2️⃣ 检查是否已在该分组（幂等性）
        const normalizedSymbol = symbol.toUpperCase();
        const existing = await Watchlist.findOne({
            userId,
            symbol: normalizedSymbol,
            groupId: targetGroupId,
        });

        if (existing) {
            // 已存在，幂等返回成功
            console.log(`[Watchlist] ${normalizedSymbol} already in group ${targetGroupId}`);
            return { success: true };
        }

        // 3️⃣ 创建新记录（允许同一股票在多个分组）
        await Watchlist.create({
            userId,
            symbol: normalizedSymbol,
            company: company.trim(),
            groupId: targetGroupId,
            addedAt: new Date(),
        });

        // 4️⃣ 异步预缓存市值数据（不阻塞响应）
        getMarketCapCache([normalizedSymbol])
            .then(() => {
                console.log(`[Watchlist] ✅ Pre-cached market cap for ${normalizedSymbol}`);
            })
            .catch((err) => {
                console.warn(`[Watchlist] ⚠️ Pre-cache failed for ${normalizedSymbol}:`, err);
            });

        return { success: true };
    } catch (error) {
        console.error('addToWatchlist error:', error);
        return { success: false, error: 'Failed to add to watchlist' };
    }
}

/**
 * 从自选列表移除股票
 * @param userId - 用户ID
 * @param symbol - 股票代码
 * @param groupId - 可选的分组ID，如果提供则只从该分组删除；否则从所有分组删除
 */
export async function removeFromWatchlist(
    userId: string,
    symbol: string,
    groupId?: string
): Promise<{ success: boolean; error?: string; deletedCount?: number }> {
    if (!userId || !symbol) {
        return { success: false, error: 'userId and symbol are required' };
    }

    try {
        await connectToDatabase();

        const query: any = {
            userId,
            symbol: symbol.toUpperCase(),
        };

        // 如果提供了 groupId，只删除该分组中的股票
        if (groupId) {
            query.groupId = groupId;
        }
        // 否则删除所有分组中的该股票

        const result = await Watchlist.deleteMany(query);

        if (result.deletedCount === 0) {
            return { success: false, error: 'Symbol not found in watchlist' };
        }

        console.log(`[Watchlist] Removed ${result.deletedCount} instance(s) of ${symbol.toUpperCase()}`);
        return { success: true, deletedCount: result.deletedCount };
    } catch (error) {
        console.error('removeFromWatchlist error:', error);
        return { success: false, error: 'Failed to remove from watchlist' };
    }
}

/**
 * 按分组获取股票列表
 */
export async function getWatchlistByGroup(
    userId: string,
    groupId?: string
): Promise<Array<{ symbol: string; company: string; addedAt: Date }>> {
    if (!userId) return [];

    try {
        await connectToDatabase();

        const query: any = { userId };
        if (groupId) {
            query.groupId = groupId;
        }

        const items = await Watchlist.find(query)
            .sort({ addedAt: -1 })
            .lean();

        return items.map((item) => ({
            symbol: item.symbol,
            company: item.company,
            addedAt: item.addedAt,
        }));
    } catch (error) {
        console.error('getWatchlistByGroup error:', error);
        return [];
    }
}

/**
 * 获取用户完整的自选列表（包括分组信息）
 */
export async function getWatchlistWithDetails(userId: string) {
    if (!userId) return [];

    try {
        await connectToDatabase();

        const items = await Watchlist.find({ userId })
            .sort({ addedAt: -1 })
            .lean();

        return items.map((item) => ({
            symbol: item.symbol,
            company: item.company,
            groupId: item.groupId,
            addedAt: item.addedAt,
        }));
    } catch (error) {
        console.error('getWatchlistWithDetails error:', error);
        return [];
    }
}

/**
 * 检查股票是否在自选列表中
 */
export async function isInWatchlist(
    userId: string,
    symbol: string
): Promise<boolean> {
    if (!userId || !symbol) return false;

    try {
        await connectToDatabase();

        const item = await Watchlist.findOne({
            userId,
            symbol: symbol.toUpperCase(),
        }).lean();

        return !!item;
    } catch (error) {
        console.error('isInWatchlist error:', error);
        return false;
    }
}