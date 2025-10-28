import { NextRequest, NextResponse } from 'next/server';
import { getCacheData } from '@/lib/actions/admin/cache-admin.actions';

/**
 * GET /api/admin/cache/data
 * Get paginated cache data with optional filters
 *
 * Query parameters:
 * - page: Page number (default: 1)
 * - pageSize: Items per page (default: 50)
 * - source: Filter by data source (yahoo/finnhub/fallback)
 * - status: Filter by status (valid/expired/expiring_soon)
 * - search: Search by symbol
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);
    const source = searchParams.get('source') || undefined;
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;

    const filters = {
      source,
      status,
      search,
    };

    const result = await getCacheData({ page, pageSize, filters });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Cache data API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch cache data',
      },
      { status: 500 }
    );
  }
}
