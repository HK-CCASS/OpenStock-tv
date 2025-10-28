import { AuditLog } from '@/database/models/audit-log.model';
import { connectToDatabase } from '@/database/mongoose';

/**
 * Audit log entry interface
 */
export interface AuditLogEntry {
  userId: string;
  userEmail: string;
  action: string;
  resource: string;
  target?: string;
  details?: Record<string, any>;
  ip: string;
  userAgent: string;
  status: 'success' | 'failure' | 'error';
  errorMessage?: string;
  duration?: number;
}

/**
 * Log admin operation to audit trail
 */
export async function logAuditEntry(entry: AuditLogEntry): Promise<void> {
  try {
    await connectToDatabase();

    await AuditLog.create({
      ...entry,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error('Failed to create audit log entry:', error);
    // Don't throw - audit logging should not break the main operation
  }
}

/**
 * Extract client information from request
 */
export function extractClientInfo(request: Request | any): {
  ip: string;
  userAgent: string;
} {
  const ip =
    request.headers?.get('x-forwarded-for') ||
    request.headers?.get('x-real-ip') ||
    'unknown';

  const userAgent =
    request.headers?.get('user-agent') || 'unknown';

  return { ip, userAgent };
}

/**
 * Get audit logs with filtering and pagination
 */
export async function getAuditLogs(params: {
  page?: number;
  pageSize?: number;
  userId?: string;
  action?: string;
  resource?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  try {
    await connectToDatabase();

    const {
      page = 1,
      pageSize = 50,
      userId,
      action,
      resource,
      status,
      startDate,
      endDate,
    } = params;

    const skip = (page - 1) * pageSize;

    // Build query
    const query: any = {};

    if (userId) query.userId = userId;
    if (action) query.action = action;
    if (resource) query.resource = resource;
    if (status) query.status = status;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = startDate;
      if (endDate) query.createdAt.$lte = endDate;
    }

    // Get logs
    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean();

    // Get total count
    const total = await AuditLog.countDocuments(query);

    return {
      logs,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  } catch (error) {
    console.error('Failed to get audit logs:', error);
    return {
      logs: [],
      total: 0,
      page: params.page || 1,
      pageSize: params.pageSize || 50,
      totalPages: 0,
    };
  }
}

/**
 * Audit decorator for admin operations
 */
export function withAudit(
  operation: (request: any, ...args: any[]) => Promise<any>,
  action: string,
  resource: string
) {
  return async (request: any, ...args: any[]) => {
    const startTime = Date.now();
    const clientInfo = extractClientInfo(request);

    // Try to get user info from auth
    let userId = 'unknown';
    let userEmail = 'unknown';

    try {
      // In a real app, extract user info from session/JWT
      // For now, we'll pass this via context
      if (request.user) {
        userId = request.user.id || 'unknown';
        userEmail = request.user.email || 'unknown';
      }
    } catch (error) {
      // Continue without user info
    }

    try {
      // Execute the operation
      const result = await operation(request, ...args);
      const duration = Date.now() - startTime;

      // Log successful operation
      await logAuditEntry({
        userId,
        userEmail,
        action,
        resource,
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent,
        status: 'success',
        duration,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Log failed operation
      await logAuditEntry({
        userId,
        userEmail,
        action,
        resource,
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent,
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        duration,
      });

      throw error;
    }
  };
}

/**
 * Predefined action types
 */
export const AUDIT_ACTIONS = {
  // View operations
  CACHE_OVERVIEW_VIEW: 'CACHE_OVERVIEW_VIEW',
  CACHE_DATA_VIEW: 'CACHE_DATA_VIEW',
  DATA_SOURCES_METRICS_VIEW: 'DATA_SOURCES_METRICS_VIEW',

  // Edit operations
  CACHE_ENTRY_EDIT: 'CACHE_ENTRY_EDIT',

  // Batch operations
  CACHE_BATCH_DELETE: 'CACHE_BATCH_DELETE',
  CACHE_BATCH_REFRESH: 'CACHE_BATCH_REFRESH',

  // Clear operations
  CACHE_CLEAR: 'CACHE_CLEAR',
  CACHE_CLEAR_REDIS: 'CACHE_CLEAR_REDIS',
  CACHE_CLEAR_MONGODB: 'CACHE_CLEAR_MONGODB',
  CACHE_CLEAR_EXPIRED: 'CACHE_CLEAR_EXPIRED',
  CACHE_CLEAR_BY_SOURCE: 'CACHE_CLEAR_BY_SOURCE',
  CACHE_CLEAR_BY_SYMBOLS: 'CACHE_CLEAR_BY_SYMBOLS',

  // Export
  CACHE_EXPORT: 'CACHE_EXPORT',

  // Security
  ADMIN_ACCESS_ATTEMPT: 'ADMIN_ACCESS_ATTEMPT',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
} as const;

export type AuditAction = typeof AUDIT_ACTIONS[keyof typeof AUDIT_ACTIONS];
