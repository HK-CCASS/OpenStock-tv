import { Document, Model, model, models, Schema } from 'mongoose';

/**
 * 市值缓存模型
 * 用于缓存股票市值数据，每日更新一次
 */

export interface IMarketCap extends Document {
  symbol: string;           // 股票代码（大写）
  marketCap: number;       // 市值（美元）
  price: number;           // 价格（用于回退计算）
  source: string;          // 数据来源（finnhub、iex、fallback）
  lastUpdated: Date;       // 最后更新时间
  validUntil: Date;        // 有效期（通常为第二天）
  createdAt: Date;
  updatedAt: Date;
}

const marketCapSchema = new Schema<IMarketCap>(
  {
    symbol: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      index: true,
    },
    marketCap: {
      type: Number,
      required: true,
      min: 0,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    source: {
      type: String,
      required: true,
      enum: ['yahoo', 'finnhub', 'iex', 'fallback'],
      default: 'yahoo',
    },
    lastUpdated: {
      type: Date,
      required: true,
      default: Date.now,
    },
    validUntil: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// 索引：symbol + validUntil 用于快速查询有效缓存
marketCapSchema.index({ symbol: 1, validUntil: 1 });

// 方法：检查缓存是否过期
marketCapSchema.methods.isExpired = function (): boolean {
  return new Date() > this.validUntil;
};

export const MarketCap: Model<IMarketCap> =
  models.MarketCap || model<IMarketCap>('MarketCap', marketCapSchema);

