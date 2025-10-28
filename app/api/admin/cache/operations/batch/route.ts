import { NextRequest, NextResponse } from 'next/server';
import { deleteCacheEntries } from '@/lib/actions/admin/cache-admin.actions';

/**
 * POST /api/admin/cache/operations/batch
 * Perform batch operations on cache entries
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, symbols } = body;

    if (!action) {
      return NextResponse.json(
        {
          success: false,
          error: 'Action is required',
        },
        { status: 400 }
      );
    }

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Symbols array is required',
        },
        { status: 400 }
      );
    }

    if (symbols.length > 500) {
      return NextResponse.json(
        {
          success: false,
          error: 'Maximum 500 symbols allowed per batch operation',
        },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case 'delete':
        result = await deleteCacheEntries(symbols);
        break;

      case 'refresh':
        // TODO: Implement refresh logic
        // For now, return success
        result = {
          success: true,
          message: 'Refresh operation queued',
        };
        break;

      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid action. Supported actions: delete, refresh',
          },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Batch operations API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to perform batch operation',
      },
      { status: 500 }
    );
  }
}
