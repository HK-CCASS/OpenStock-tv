/**
 * 数据适配器 - 将MongoDB数据转换为multi-stock-module需要的格式
 */

import type { WatchlistGroupInfo } from '@/lib/actions/watchlist-group.actions';

/**
 * Multi-stock模块期望的WatchlistInfo格式
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
 * 将MongoDB的WatchlistGroup数据转换为multi-stock模块格式
 */
export function adaptWatchlistGroupsToModuleFormat(
    groups: WatchlistGroupInfo[]
): WatchlistInfo[] {
    return groups.map((group, index) => ({
        id: index + 1, // Multi-stock模块使用数字ID，这里使用索引+1
        name: group.name,
        symbolCount: group.symbolCount,
        category: group.category,
        is_system: group.isSystem,
        is_active: group.isActive,
        created_at: group.createdAt,
        updated_at: group.updatedAt,
        symbols: group.symbols,
    }));
}

/**
 * 将股票数据转换为模块需要的格式
 */
export function adaptSymbolsForModule(
    symbols: Array<{ symbol: string; company: string }>
): Array<{ symbol: string; company: string }> {
    // 这个格式已经匹配，直接返回
    return symbols.map((s) => ({
        symbol: s.symbol.toUpperCase(),
        company: s.company.trim(),
    }));
}

/**
 * 根据MongoDB的groupId查找对应的模块format ID
 */
export function findModuleIdByGroupId(
    groups: WatchlistGroupInfo[],
    groupId: string
): string {
    const index = groups.findIndex((g) => g.id === groupId);
    return index >= 0 ? String(index + 1) : '1';
}

