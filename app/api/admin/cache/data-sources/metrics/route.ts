import { NextRequest, NextResponse } from 'next/server';
import { getDataSourceMetrics } from '@/lib/actions/admin/cache-admin.actions';
import { withAdminSecurity, OPERATION_TYPES } from '@/lib/utils/api-permissions';

/**
 * GET /api/admin/cache/data-sources/metrics
 * Get detailed data source metrics and performance indicators
 *
 * Query parameters:
 * - period: Time period for metrics (1d, 7d, 30d, 90d) - default: 7d
 * - source: Filter by specific source (yahoo, finnhub, fallback) - optional
 */
async function handleGet(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '7d';
    const source = searchParams.get('source') || undefined;

    const metrics = await getDataSourceMetrics({ period, source });

    return NextResponse.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    console.error('Data source metrics API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch data source metrics',
      },
      { status: 500 }
    );
  }
}

// Apply admin security (permission check + rate limiting)
export const GET = withAdminSecurity(handleGet, { operationType: OPERATION_TYPES.GET_METRICS });
