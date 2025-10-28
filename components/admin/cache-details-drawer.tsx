'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, Save, X } from 'lucide-react';

interface CacheDataItem {
  symbol: string;
  marketCap: number;
  price: number;
  source: string;
  lastUpdated: string;
  validUntil: string;
  status: 'valid' | 'expired' | 'expiring_soon';
}

interface CacheDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: CacheDataItem | null;
  onSave?: (symbol: string, data: Partial<CacheDataItem>) => Promise<void>;
}

export function CacheDetailsDrawer({
  open,
  onOpenChange,
  item,
  onSave,
}: CacheDetailsDrawerProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<CacheDataItem>>({});

  useEffect(() => {
    if (item) {
      setFormData({
        symbol: item.symbol,
        marketCap: item.marketCap,
        price: item.price,
        source: item.source,
        validUntil: item.validUntil,
      });
    }
  }, [item]);

  const handleSave = async () => {
    if (!item || !onSave) return;

    try {
      setSaving(true);
      await onSave(item.symbol, formData);
      setEditing(false);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save:', error);
      alert('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (editing) {
      // Reset form data
      if (item) {
        setFormData({
          symbol: item.symbol,
          marketCap: item.marketCap,
          price: item.price,
          source: item.source,
          validUntil: item.validUntil,
        });
      }
      setEditing(false);
    } else {
      onOpenChange(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'valid':
        return <Badge className="bg-green-500/20 text-green-400">有效</Badge>;
      case 'expired':
        return <Badge className="bg-red-500/20 text-red-400">过期</Badge>;
      case 'expiring_soon':
        return <Badge className="bg-yellow-500/20 text-yellow-400">即将过期</Badge>;
      default:
        return <Badge className="bg-gray-500/20 text-gray-400">未知</Badge>;
    }
  };

  const formatMarketCap = (value: number) => {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    return `$${value.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1f1f1f] border-[#2a2a2a] text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center justify-between">
            <span>缓存条目详情</span>
            <div className="flex items-center gap-2">
              {getStatusBadge(item.status)}
              {!editing && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-[#2a2a2a] text-gray-400"
                  onClick={() => setEditing(true)}
                >
                  编辑
                </Button>
              )}
            </div>
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            查看和编辑缓存数据详情
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-400">股票代码</Label>
              {editing ? (
                <Input
                  value={formData.symbol || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, symbol: e.target.value })
                  }
                  className="bg-[#262626] border-[#2a2a2a] text-white"
                />
              ) : (
                <p className="text-white font-medium">{item.symbol}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-gray-400">数据源</Label>
              {editing ? (
                <Input
                  value={formData.source || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, source: e.target.value })
                  }
                  className="bg-[#262626] border-[#2a2a2a] text-white"
                  placeholder="yahoo/finnhub/fallback"
                />
              ) : (
                <p className="text-white">{item.source}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-gray-400">价格</Label>
              {editing ? (
                <Input
                  type="number"
                  value={formData.price || 0}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      price: parseFloat(e.target.value),
                    })
                  }
                  className="bg-[#262626] border-[#2a2a2a] text-white"
                  step="0.01"
                />
              ) : (
                <p className="text-white">${item.price.toFixed(2)}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-gray-400">市值</Label>
              {editing ? (
                <Input
                  type="number"
                  value={formData.marketCap || 0}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      marketCap: parseFloat(e.target.value),
                    })
                  }
                  className="bg-[#262626] border-[#2a2a2a] text-white"
                />
              ) : (
                <p className="text-white">{formatMarketCap(item.marketCap)}</p>
              )}
            </div>

            <div className="space-y-2 col-span-2">
              <Label className="text-gray-400">有效期至</Label>
              {editing ? (
                <Input
                  type="datetime-local"
                  value={
                    formData.validUntil
                      ? new Date(formData.validUntil)
                          .toISOString()
                          .slice(0, 16)
                      : ''
                  }
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      validUntil: new Date(e.target.value).toISOString(),
                    })
                  }
                  className="bg-[#262626] border-[#2a2a2a] text-white"
                />
              ) : (
                <p className="text-white">{formatDate(item.validUntil)}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-gray-400">更新时间</Label>
              <p className="text-gray-400 text-sm">
                {formatDate(item.lastUpdated)}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-400">当前状态</Label>
              <div>{getStatusBadge(item.status)}</div>
            </div>
          </div>

          <Separator className="bg-[#2a2a2a]" />

          <div className="space-y-2">
            <Label className="text-gray-400">技术信息</Label>
            <div className="bg-[#262626] border border-[#2a2a2a] rounded-lg p-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Redis 缓存:</span>
                <span className="text-white">
                  {item.status === 'valid' ? '已缓存' : '未缓存'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">MongoDB 存储:</span>
                <span className="text-white">已存储</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">TTL 状态:</span>
                <span className="text-white">
                  {Math.round(
                    (new Date(item.validUntil).getTime() - Date.now()) /
                      (1000 * 60 * 60)
                  )}
                  小时
                </span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          {editing ? (
            <>
              <Button
                variant="outline"
                onClick={() => setEditing(false)}
                disabled={saving}
                className="border-[#2a2a2a] text-gray-400"
              >
                <X className="h-4 w-4 mr-2" />
                取消
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                保存
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              onClick={handleCancel}
              className="border-[#2a2a2a] text-gray-400"
            >
              <X className="h-4 w-4 mr-2" />
              关闭
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
