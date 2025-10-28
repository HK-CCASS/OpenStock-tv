import { NextRequest, NextResponse } from 'next/server';
import { updateCacheEntry } from '@/lib/actions/admin/cache-admin.actions';

/**
 * POST /api/admin/cache/update
 * Update a single cache entry
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbol, data } = body;

    if (!symbol) {
      return NextResponse.json(
        {
          success: false,
          error: 'Symbol is required',
        },
        { status: 400 }
      );
    }

    const result = await updateCacheEntry(symbol, data);

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result.data,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to update cache entry',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Cache update API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update cache entry',
      },
      { status: 500 }
    );
  }
}
