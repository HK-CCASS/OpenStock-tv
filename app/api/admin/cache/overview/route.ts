import { NextRequest, NextResponse } from 'next/server';
import { getCacheOverview } from '@/lib/actions/admin/cache-admin.actions';

/**
 * GET /api/admin/cache/overview
 * Get cache system overview statistics
 */
export async function GET(request: NextRequest) {
  try {
    const overview = await getCacheOverview();

    return NextResponse.json({
      success: true,
      data: overview,
    });
  } catch (error) {
    console.error('Cache overview API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch cache overview',
      },
      { status: 500 }
    );
  }
}
