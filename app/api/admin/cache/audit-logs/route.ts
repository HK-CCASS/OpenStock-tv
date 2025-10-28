import { NextRequest, NextResponse } from 'next/server';
import { getAuditLogs } from '@/lib/utils/audit-logger';
import { withAdminSecurity, OPERATION_TYPES } from '@/lib/utils/api-permissions';

/**
 * GET /api/admin/cache/audit-logs
 * Get audit logs with filtering and pagination
 *
 * Query parameters:
 * - page: Page number (default: 1)
 * - pageSize: Items per page (default: 50)
 * - userId: Filter by user ID
 * - action: Filter by action type
 * - resource: Filter by resource type
 * - status: Filter by status (success/failure/error)
 * - startDate: Filter by start date (ISO string)
 * - endDate: Filter by end date (ISO string)
 */
async function handleGet(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);
    const userId = searchParams.get('userId') || undefined;
    const action = searchParams.get('action') || undefined;
    const resource = searchParams.get('resource') || undefined;
    const status = searchParams.get('status') || undefined;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const result = await getAuditLogs({
      page,
      pageSize,
      userId,
      action,
      resource,
      status,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Audit logs API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch audit logs',
      },
      { status: 500 }
    );
  }
}

// Apply admin security (permission check + rate limiting)
export const GET = withAdminSecurity(handleGet, { operationType: OPERATION_TYPES.GET_DATA });
