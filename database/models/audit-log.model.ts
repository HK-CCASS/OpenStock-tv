import mongoose, { Schema, models, model } from 'mongoose';

/**
 * Audit Log Schema
 * Tracks all admin operations for security and compliance
 */
export interface IAuditLog {
  _id: mongoose.Types.ObjectId;
  userId: string;
  userEmail: string;
  action: string; // e.g., 'CACHE_CLEAR', 'CACHE_UPDATE', 'CACHE_DELETE'
  resource: string; // e.g., 'cache', 'redis', 'mongodb'
  target?: string; // e.g., symbol, source name
  details?: Record<string, any>; // Additional operation details
  ip: string;
  userAgent: string;
  status: 'success' | 'failure' | 'error';
  errorMessage?: string;
  duration?: number; // Operation duration in ms
  createdAt: Date;
  updatedAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    userEmail: {
      type: String,
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
      enum: [
        'CACHE_OVERVIEW_VIEW',
        'CACHE_DATA_VIEW',
        'CACHE_DATA_FILTER',
        'CACHE_ENTRY_EDIT',
        'CACHE_BATCH_DELETE',
        'CACHE_BATCH_REFRESH',
        'CACHE_CLEAR',
        'CACHE_CLEAR_REDIS',
        'CACHE_CLEAR_MONGODB',
        'CACHE_CLEAR_EXPIRED',
        'CACHE_CLEAR_BY_SOURCE',
        'CACHE_CLEAR_BY_SYMBOLS',
        'CACHE_EXPORT',
        'DATA_SOURCES_METRICS_VIEW',
        'SSE_CONNECT',
        'ADMIN_ACCESS_ATTEMPT',
        'PERMISSION_DENIED',
      ],
    },
    resource: {
      type: String,
      required: true,
      index: true,
    },
    target: {
      type: String,
      index: true,
    },
    details: {
      type: Schema.Types.Mixed,
    },
    ip: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['success', 'failure', 'error'],
      index: true,
    },
    errorMessage: {
      type: String,
    },
    duration: {
      type: Number, // in milliseconds
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying
AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ userId: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ resource: 1, createdAt: -1 });

// TTL index - automatically delete logs after 90 days
AuditLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 }
);

export const AuditLog = models.AuditLog || model<IAuditLog>('AuditLog', AuditLogSchema);
