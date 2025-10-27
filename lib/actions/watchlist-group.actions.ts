'use server';

import { connectToDatabase } from '@/database/mongoose';
import { WatchlistGroup } from '@/database/models/watchlist-group.model';
import { Watchlist } from '@/database/models/watchlist.model';

export interface WatchlistGroupInfo {
    id: string;
    name: string;
    symbolCount: number;
    category?: string;
    isSystem: boolean;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    symbols: string[];
}

export interface WatchlistGroupDetail {
    id: string;
    name: string;
    category?: string;
    isSystem: boolean;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    symbols: Array<{ symbol: string; company: string }>;
}

/**
 * 创建自选列表分组
 */
export async function createWatchlistGroup(
    userId: string,
    name: string,
    category?: string
): Promise<{ success: boolean; groupId?: string; error?: string }> {
    if (!userId || !name) {
        return { success: false, error: 'userId and name are required' };
    }

    try {
        await connectToDatabase();

        const trimmedName = name.trim();

        // 检查是否存在软删除的同名分组
        const existingGroup = await WatchlistGroup.findOne({
            userId,
            name: trimmedName,
            isActive: false, // 只查找已删除的
        });

        if (existingGroup) {
            // 重新激活已删除的分组（保留历史数据）
            existingGroup.isActive = true;
            if (category !== undefined) {
                existingGroup.category = category?.trim();
            }
            await existingGroup.save();
            
            return { success: true, groupId: existingGroup._id.toString() };
        }

        // 创建新分组
        const newGroup = await WatchlistGroup.create({
            userId,
            name: trimmedName,
            category: category?.trim(),
            isSystem: false,
            isActive: true,
        });

        return { success: true, groupId: newGroup._id.toString() };
    } catch (error: any) {
        // Handle duplicate name error
        if (error.code === 11000) {
            return { success: false, error: 'A watchlist with this name already exists' };
        }
        console.error('createWatchlistGroup error:', error);
        return { success: false, error: 'Failed to create watchlist group' };
    }
}

/**
 * 获取用户所有分组（简化格式）
 */
export async function getWatchlistGroupsByUser(userId: string): Promise<WatchlistGroupInfo[]> {
    if (!userId) return [];

    try {
        await connectToDatabase();

        const groups = await WatchlistGroup.find({ userId, isActive: true })
            .sort({ createdAt: 1 })
            .lean();

        // 获取每个分组的股票数量和符号列表
        const groupsWithSymbols = await Promise.all(
            groups.map(async (group) => {
                const items = await Watchlist.find(
                    { userId, groupId: group._id.toString() },
                    { symbol: 1 }
                ).lean();

                return {
                    id: group._id.toString(),
                    name: group.name,
                    symbolCount: items.length,
                    category: group.category,
                    isSystem: group.isSystem,
                    isActive: group.isActive,
                    createdAt: group.createdAt.toISOString(),
                    updatedAt: group.updatedAt.toISOString(),
                    symbols: items.map((item) => item.symbol),
                };
            })
        );

        return groupsWithSymbols;
    } catch (error) {
        console.error('getWatchlistGroupsByUser error:', error);
        return [];
    }
}

/**
 * 获取分组详情（包含完整股票信息）
 */
export async function getWatchlistGroupDetail(
    userId: string,
    groupId: string
): Promise<WatchlistGroupDetail | null> {
    if (!userId || !groupId) return null;

    try {
        await connectToDatabase();

        const group = await WatchlistGroup.findOne({
            _id: groupId,
            userId,
            isActive: true,
        }).lean();

        if (!group) return null;

        const items = await Watchlist.find(
            { userId, groupId },
            { symbol: 1, company: 1 }
        ).lean();

        return {
            id: group._id.toString(),
            name: group.name,
            category: group.category,
            isSystem: group.isSystem,
            isActive: group.isActive,
            createdAt: group.createdAt.toISOString(),
            updatedAt: group.updatedAt.toISOString(),
            symbols: items.map((item) => ({
                symbol: item.symbol,
                company: item.company,
            })),
        };
    } catch (error) {
        console.error('getWatchlistGroupDetail error:', error);
        return null;
    }
}

/**
 * 更新分组信息
 */
export async function updateWatchlistGroup(
    userId: string,
    groupId: string,
    updates: { name?: string; category?: string }
): Promise<{ success: boolean; error?: string }> {
    if (!userId || !groupId) {
        return { success: false, error: 'userId and groupId are required' };
    }

    try {
        await connectToDatabase();

        const updateData: any = {};
        if (updates.name) updateData.name = updates.name.trim();
        if (updates.category !== undefined) updateData.category = updates.category?.trim();

        const result = await WatchlistGroup.findOneAndUpdate(
            { _id: groupId, userId, isSystem: false }, // Can't update system groups
            { $set: updateData },
            { new: true }
        );

        if (!result) {
            return { success: false, error: 'Group not found or cannot be updated' };
        }

        return { success: true };
    } catch (error: any) {
        if (error.code === 11000) {
            return { success: false, error: 'A watchlist with this name already exists' };
        }
        console.error('updateWatchlistGroup error:', error);
        return { success: false, error: 'Failed to update watchlist group' };
    }
}

/**
 * 删除分组（软删除）
 */
export async function deleteWatchlistGroup(
    userId: string,
    groupId: string
): Promise<{ success: boolean; error?: string }> {
    if (!userId || !groupId) {
        return { success: false, error: 'userId and groupId are required' };
    }

    try {
        await connectToDatabase();

        const result = await WatchlistGroup.findOneAndUpdate(
            { _id: groupId, userId, isSystem: false }, // Can't delete system groups
            { $set: { isActive: false } },
            { new: true }
        );

        if (!result) {
            return { success: false, error: 'Group not found or cannot be deleted' };
        }

        return { success: true };
    } catch (error) {
        console.error('deleteWatchlistGroup error:', error);
        return { success: false, error: 'Failed to delete watchlist group' };
    }
}

/**
 * 获取或创建默认分组
 * 用于没有分组的股票或新用户
 */
export async function getOrCreateDefaultGroup(userId: string): Promise<string | null> {
    if (!userId) return null;

    try {
        await connectToDatabase();

        // 查找是否已有默认分组
        let defaultGroup = await WatchlistGroup.findOne({
            userId,
            name: '我的自选',
            isActive: true,
        }).lean();

        // 如果没有，创建一个
        if (!defaultGroup) {
            defaultGroup = await WatchlistGroup.create({
                userId,
                name: '我的自选',
                category: '默认',
                isSystem: true,
                isActive: true,
            });
        }

        return defaultGroup._id.toString();
    } catch (error) {
        console.error('getOrCreateDefaultGroup error:', error);
        return null;
    }
}

