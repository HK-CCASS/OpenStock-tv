import { Schema, model, models, type Document, type Model } from 'mongoose';

export interface WatchlistGroup extends Document {
    userId: string;
    name: string;
    category?: string;
    isSystem: boolean;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const WatchlistGroupSchema = new Schema<WatchlistGroup>(
    {
        userId: { type: String, required: true, index: true },
        name: { type: String, required: true, trim: true },
        category: { type: String, trim: true },
        isSystem: { type: Boolean, default: false },
        isActive: { type: Boolean, default: true },
    },
    { 
        timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
    }
);

// Index for efficient user queries
WatchlistGroupSchema.index({ userId: 1, isActive: 1 });

// Prevent duplicate group names per user
WatchlistGroupSchema.index({ userId: 1, name: 1 }, { unique: true });

export const WatchlistGroup: Model<WatchlistGroup> =
    (models?.WatchlistGroup as Model<WatchlistGroup>) || model<WatchlistGroup>('WatchlistGroup', WatchlistGroupSchema);

