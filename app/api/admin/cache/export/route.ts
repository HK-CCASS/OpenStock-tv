import { NextRequest, NextResponse } from 'next/server';
import { exportCacheData } from '@/lib/actions/admin/cache-admin.actions';

/**
 * GET /api/admin/cache/export
 * Export cache data in various formats
 *
 * Query parameters:
 * - type: Export type (all, expired, bySource) - default: all
 * - format: Export format (csv, json, excel) - default: csv
 * - source: Filter by source (yahoo, finnhub, fallback) - optional
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';
    const format = searchParams.get('format') || 'csv';
    const source = searchParams.get('source') || undefined;

    const exportResult = await exportCacheData({ type, format, source });

    if (!exportResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: exportResult.error || 'Failed to export cache data',
        },
        { status: 500 }
      );
    }

    // Set appropriate headers based on format
    const headers = new Headers();
    const fileName = `${type}_cache_data.${format}`;
    headers.set('Content-Disposition', `attachment; filename="${fileName}"`);

    switch (format) {
      case 'csv':
        headers.set('Content-Type', 'text/csv');
        break;
      case 'json':
        headers.set('Content-Type', 'application/json');
        break;
      case 'excel':
        headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        break;
      default:
        headers.set('Content-Type', 'text/plain');
    }

    return new NextResponse(exportResult.data, { headers });
  } catch (error) {
    console.error('Cache export API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to export cache data',
      },
      { status: 500 }
    );
  }
}
