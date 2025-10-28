import { NextRequest, NextResponse } from 'next/server';
import { getCacheOverview } from '@/lib/actions/admin/cache-admin.actions';
import { withAdminSecurity, OPERATION_TYPES } from '@/lib/utils/api-permissions';

/**
 * GET /api/admin/cache/overview
 * Get cache system overview statistics
 */
async function handleGet(request: NextRequest) {
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

// Apply admin security (permission check + rate limiting)
export const GET = withAdminSecurity(handleGet, { operationType: OPERATION_TYPES.GET_OVERVIEW });
