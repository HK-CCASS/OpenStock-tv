import { Schema, model, models, type Document, type Model } from 'mongoose';

export interface WatchlistItem extends Document {
    userId: string;
    symbol: string;
    company: string;
    groupId?: string; // Reference to WatchlistGroup
    addedAt: Date;
}

const WatchlistSchema = new Schema<WatchlistItem>(
    {
        userId: { type: String, required: true, index: true },
        symbol: { type: String, required: true, uppercase: true, trim: true },
        company: { type: String, required: true, trim: true },
        groupId: { type: String, index: true }, // Optional reference to WatchlistGroup
        addedAt: { type: Date, default: Date.now },
    },
    { timestamps: false }
);

// 允许同一股票出现在多个分组（旧索引：{ userId, symbol }）
// 新索引：每个用户的每个分组中，每个股票只能出现一次
WatchlistSchema.index({ userId: 1, symbol: 1, groupId: 1 }, { unique: true });
// 查询优化：按用户和分组查询
WatchlistSchema.index({ userId: 1, groupId: 1 });

export const Watchlist: Model<WatchlistItem> =
    (models?.Watchlist as Model<WatchlistItem>) || model<WatchlistItem>('Watchlist', WatchlistSchema);