import { NextRequest } from 'next/server';
import { getCacheOverview, getDataSourceMetrics } from '@/lib/actions/admin/cache-admin.actions';
import { withAdminSecurity, OPERATION_TYPES } from '@/lib/utils/api-permissions';

/**
 * GET /api/admin/cache/stream
 * Server-Sent Events for real-time cache updates
 *
 * This endpoint provides real-time updates for:
 * - Cache overview changes
 * - Performance metrics
 * - Data source health
 */

async function handleGet(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // Send initial connection message
      send({
        type: 'connected',
        timestamp: new Date().toISOString(),
        message: 'Cache monitoring connected',
      });

      // Send initial data
      try {
        const overview = await getCacheOverview();
        const metrics = await getDataSourceMetrics({ period: '1d' });
        send({
          type: 'initial',
          data: { overview, metrics },
        });
      } catch (error) {
        send({
          type: 'error',
          message: 'Failed to load initial data',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      // Set up periodic updates (every 10 seconds)
      const interval = setInterval(async () => {
        try {
          const overview = await getCacheOverview();
          const metrics = await getDataSourceMetrics({ period: '1h' });

          send({
            type: 'update',
            data: { overview, metrics },
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          send({
            type: 'error',
            message: 'Failed to fetch updates',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }, 10000); // 10 seconds

      // Clean up on client disconnect
      const cleanup = () => {
        clearInterval(interval);
        controller.close();
      };

      // Handle client disconnect
      request.signal.addEventListener('abort', cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}

// Apply admin security (permission check + rate limiting)
// Note: Rate limiting is disabled for SSE to allow continuous connection
export const GET = withAdminSecurity(handleGet, { operationType: OPERATION_TYPES.GET_DATA });
