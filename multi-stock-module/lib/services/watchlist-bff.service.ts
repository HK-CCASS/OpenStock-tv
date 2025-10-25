/**
 * Watchlist BFF Service
 *
 * Frontend service for interacting with new BFF API endpoints
 * Replaces Server Actions with direct API calls (Phase 3)
 */

// Types for BFF API responses
export interface BFFWatchlist {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  symbols_count?: number;
}

export interface BFFWatchlistSymbol {
  symbol: string;
  sort_order: number;
  stock_name?: string;
  market_cap?: number;
  market_cap_updated_at?: string;
}

export interface BFFApiResponse<T = any> {
  success: boolean;
  data: T;
  error?: string;
}

export interface BFFWatchlistCreateRequest {
  name: string;
  description?: string;
}

export interface BFFWatchlistUpdateRequest {
  name?: string;
  description?: string;
  is_active?: boolean;
}

export interface BFFSymbolsRequest {
  symbols: string[];
}

const BASE_URL = process.env.NODE_ENV === 'production'
  ? process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'
  : 'http://localhost:3001';

// 简单的内存缓存，生产环境建议使用Redis
const cache = new Map<string, { data: any; expiry: number }>();

/**
 * Get all watchlists from BFF API with caching
 */
export async function getAllWatchlists(): Promise<BFFWatchlist[]> {
  const CACHE_KEY = 'watchlists_all';
  const CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

  try {
    // 检查缓存
    if (cache.has(CACHE_KEY)) {
      const cached = cache.get(CACHE_KEY);
      const now = Date.now();

      // 验证缓存是否有效
      if (cached && cached.expiry > now) {
        cache.delete(CACHE_KEY);
      } else {
        return cached.data; // 返回缓存数据
      }
    }

    const response = await fetch(`${BASE_URL}/api/watchlists`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`BFF API error: ${response.status} ${response.statusText}`);
    }

    const apiResponse: BFFApiResponse<BFFWatchlist[]> = await response.json();

    if (!apiResponse.success) {
      throw new Error(`BFF API failure: ${apiResponse.error}`);
    }

    // 更新缓存
    cache.set(CACHE_KEY, {
      data: apiResponse.data,
      expiry: Date.now() + CACHE_TTL,
    });

    return apiResponse.data;
  } catch (error) {
    console.error('[ERROR] getAllWatchlists:', error);
    return [];
  }
}

/**
 * Get specific watchlist by ID from BFF API
 */
export async function getWatchlistById(id: number): Promise<BFFWatchlist | null> {
  try {
    const response = await fetch(`${BASE_URL}/api/watchlists/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`BFF API error: ${response.status} ${response.statusText}`);
    }

    const apiResponse: BFFApiResponse<BFFWatchlist> = await response.json();

    if (!apiResponse.success) {
      throw new Error(`BFF API failure: ${apiResponse.error}`);
    }

    return apiResponse.data;
  } catch (error) {
    console.error('[ERROR] getWatchlistById:', error);
    return null;
  }
}

/**
 * Create new watchlist via BFF API
 */
export async function createWatchlist(request: BFFWatchlistCreateRequest): Promise<BFFWatchlist | null> {
  try {
    const response = await fetch(`${BASE_URL}/api/watchlists`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`BFF API error: ${response.status} ${response.statusText}`);
    }

    const apiResponse: BFFApiResponse<BFFWatchlist> = await response.json();

    if (!apiResponse.success) {
      throw new Error(`BFF API failure: ${apiResponse.error}`);
    }

    return apiResponse.data;
  } catch (error) {
    console.error('[ERROR] createWatchlist:', error);
    return null;
  }
}

/**
 * Update existing watchlist via BFF API
 */
export async function updateWatchlist(id: number, request: BFFWatchlistUpdateRequest): Promise<BFFWatchlist | null> {
  try {
    const response = await fetch(`${BASE_URL}/api/watchlists/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`BFF API error: ${response.status} ${response.statusText}`);
    }

    const apiResponse: BFFApiResponse<BFFWatchlist> = await response.json();

    if (!apiResponse.success) {
      throw new Error(`BFF API failure: ${apiResponse.error}`);
    }

    return apiResponse.data;
  } catch (error) {
    console.error('[ERROR] updateWatchlist:', error);
    return null;
  }
}

/**
 * Delete watchlist via BFF API
 */
export async function deleteWatchlist(id: number): Promise<boolean> {
  try {
    const response = await fetch(`${BASE_URL}/api/watchlists/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`BFF API error: ${response.status} ${response.statusText}`);
    }

    const apiResponse: BFFApiResponse<{ message: string; deleted_id: number }> = await response.json();

    if (!apiResponse.success) {
      throw new Error(`BFF API failure: ${apiResponse.error}`);
    }

    return true;
  } catch (error) {
    console.error('[ERROR] deleteWatchlist:', error);
    return false;
  }
}

/**
 * Get symbols for a specific watchlist from BFF API
 */
export async function getWatchlistSymbols(id: number): Promise<BFFWatchlistSymbol[]> {
  try {
    const response = await fetch(`${BASE_URL}/api/watchlists/${id}/symbols`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`BFF API error: ${response.status} ${response.statusText}`);
    }

    const apiResponse: BFFApiResponse<BFFWatchlistSymbol[]> = await response.json();

    if (!apiResponse.success) {
      throw new Error(`BFF API failure: ${apiResponse.error}`);
    }

    return apiResponse.data;
  } catch (error) {
    console.error('[ERROR] getWatchlistSymbols:', error);
    return [];
  }
}

/**
 * Add symbols to watchlist via BFF API
 */
export async function addSymbolsToWatchlist(id: number, request: BFFSymbolsRequest): Promise<{ added_count: number; already_existed: number } | null> {
  try {
    const response = await fetch(`${BASE_URL}/api/watchlists/${id}/symbols`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`BFF API error: ${response.status} ${response.statusText}`);
    }

    const apiResponse: BFFApiResponse<{ message: string; added_count: number; total_requested: number; already_existed: number }> = await response.json();

    if (!apiResponse.success) {
      throw new Error(`BFF API failure: ${apiResponse.error}`);
    }

    return {
      added_count: apiResponse.data.added_count,
      already_existed: apiResponse.data.already_existed,
    };
  } catch (error) {
    console.error('[ERROR] addSymbolsToWatchlist:', error);
    return null;
  }
}

/**
 * Remove symbols from watchlist via BFF API
 */
export async function removeSymbolsFromWatchlist(id: number, request: BFFSymbolsRequest): Promise<{ deleted_count: number; not_found: number } | null> {
  try {
    const response = await fetch(`${BASE_URL}/api/watchlists/${id}/symbols`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`BFF API error: ${response.status} ${response.statusText}`);
    }

    const apiResponse: BFFApiResponse<{ message: string; deleted_count: number; total_requested: number; not_found: number }> = await response.json();

    if (!apiResponse.success) {
      throw new Error(`BFF API failure: ${apiResponse.error}`);
    }

    return {
      deleted_count: apiResponse.data.deleted_count,
      not_found: apiResponse.data.not_found,
    };
  } catch (error) {
    console.error('[ERROR] removeSymbolsFromWatchlist:', error);
    return null;
  }
}