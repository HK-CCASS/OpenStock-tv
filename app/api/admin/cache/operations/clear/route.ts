import { NextRequest, NextResponse } from 'next/server';
import { clearCache } from '@/lib/actions/admin/cache-admin.actions';

/**
 * POST /api/admin/cache/operations/clear
 * Clear cache data (dangerous operation)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { redis, mongodb, expired, bySource, symbols } = body;

    if (!redis && !mongodb) {
      return NextResponse.json(
        {
          success: false,
          error: 'At least one of redis or mongodb must be specified',
        },
        { status: 400 }
      );
    }

    // Prevent accidental clear all without explicit confirmation
    if (mongodb && !expired && !bySource && !symbols) {
      return NextResponse.json(
        {
          success: false,
          error: 'Clearing all MongoDB cache is not allowed. Use specific filters.',
        },
        { status: 400 }
      );
    }

    const result = await clearCache({
      redis,
      mongodb,
      expired,
      bySource,
      symbols,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result.results,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to clear cache',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Cache clear API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to clear cache',
      },
      { status: 500 }
    );
  }
}
