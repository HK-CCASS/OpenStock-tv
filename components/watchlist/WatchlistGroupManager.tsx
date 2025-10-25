'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Edit2, Trash2, Save, X, TrendingUp, PlusCircle, Eye } from 'lucide-react';
import { toast } from 'sonner';
import type { WatchlistGroupInfo } from '@/lib/actions/watchlist-group.actions';
import {
  createWatchlistGroup,
  updateWatchlistGroup,
  deleteWatchlistGroup,
  getWatchlistGroupsByUser,
  getWatchlistGroupDetail,
} from '@/lib/actions/watchlist-group.actions';
import AddStockToGroup from './AddStockToGroup';
import ViewGroupStocks from './ViewGroupStocks';

interface WatchlistGroupManagerProps {
  initialGroups: WatchlistGroupInfo[];
  userId: string;
}

export default function WatchlistGroupManager({
  initialGroups,
  userId,
}: WatchlistGroupManagerProps) {
  const [groups, setGroups] = useState<WatchlistGroupInfo[]>(initialGroups);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupCategory, setNewGroupCategory] = useState('');
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [addStockDialogOpen, setAddStockDialogOpen] = useState(false);
  const [selectedGroupForAdd, setSelectedGroupForAdd] = useState<{ id: string; name: string } | null>(null);
  const [viewStocksDialogOpen, setViewStocksDialogOpen] = useState(false);
  const [selectedGroupForView, setSelectedGroupForView] = useState<{
    id: string;
    name: string;
    stocks: Array<{ symbol: string; company: string }>;
  } | null>(null);

  // 创建新分组
  const handleCreate = async () => {
    if (!newGroupName.trim()) {
      toast.error('请输入分组名称');
      return;
    }

    setIsLoading(true);
    const result = await createWatchlistGroup(
      userId,
      newGroupName.trim(),
      newGroupCategory.trim() || undefined
    );

    if (result.success && result.groupId) {
      const newGroup: WatchlistGroupInfo = {
        id: result.groupId,
        name: newGroupName.trim(),
        category: newGroupCategory.trim() || undefined,
        isSystem: false,
        isActive: true,
        symbolCount: 0,
        symbols: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setGroups([...groups, newGroup]);
      setNewGroupName('');
      setNewGroupCategory('');
      setIsCreating(false);
      toast.success('分组创建成功');
    } else {
      toast.error(result.error || '创建失败');
    }
    setIsLoading(false);
  };

  // 更新分组
  const handleUpdate = async (groupId: string) => {
    if (!editName.trim()) {
      toast.error('请输入分组名称');
      return;
    }

    setIsLoading(true);
    const result = await updateWatchlistGroup(userId, groupId, {
      name: editName.trim(),
      category: editCategory.trim() || undefined,
    });

    if (result.success) {
      setGroups(
        groups.map((g) =>
          g.id === groupId
            ? {
                ...g,
                name: editName.trim(),
                category: editCategory.trim() || undefined,
                updatedAt: new Date().toISOString(),
              }
            : g
        )
      );
      setEditingId(null);
      toast.success('分组更新成功');
    } else {
      toast.error(result.error || '更新失败');
    }
    setIsLoading(false);
  };

  // 删除分组
  const handleDelete = async (groupId: string, groupName: string) => {
    if (!confirm(`确定要删除分组 "${groupName}" 吗？此操作不可恢复。`)) {
      return;
    }

    setIsLoading(true);
    const result = await deleteWatchlistGroup(userId, groupId);

    if (result.success) {
      setGroups(groups.filter((g) => g.id !== groupId));
      toast.success('分组删除成功');
    } else {
      toast.error(result.error || '删除失败');
    }
    setIsLoading(false);
  };

  // 开始编辑
  const startEdit = (group: WatchlistGroupInfo) => {
    setEditingId(group.id);
    setEditName(group.name);
    setEditCategory(group.category || '');
  };

  // 取消编辑
  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditCategory('');
  };

  // 打开添加股票对话框
  const openAddStockDialog = (groupId: string, groupName: string) => {
    setSelectedGroupForAdd({ id: groupId, name: groupName });
    setAddStockDialogOpen(true);
  };

  // 刷新分组数据
  const refreshGroups = async () => {
    const updatedGroups = await getWatchlistGroupsByUser(userId);
    setGroups(updatedGroups);
  };

  // 打开查看股票对话框
  const openViewStocksDialog = async (groupId: string, groupName: string) => {
    const groupDetail = await getWatchlistGroupDetail(userId, groupId);
    if (groupDetail) {
      setSelectedGroupForView({
        id: groupId,
        name: groupName,
        stocks: groupDetail.symbols,
      });
      setViewStocksDialogOpen(true);
    } else {
      toast.error('无法加载分组详情');
    }
  };

  return (
    <div className="space-y-6">
      {/* 创建新分组 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>分组列表</CardTitle>
              <CardDescription>管理您的股票自选列表分组</CardDescription>
            </div>
            {!isCreating && (
              <Button onClick={() => setIsCreating(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                创建新分组
              </Button>
            )}
          </div>
        </CardHeader>

        {isCreating && (
          <CardContent>
            <div className="space-y-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
              <div className="space-y-2">
                <Label htmlFor="new-group-name">分组名称 *</Label>
                <Input
                  id="new-group-name"
                  placeholder="例如：科技股、能源股"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-group-category">分类（可选）</Label>
                <Input
                  id="new-group-category"
                  placeholder="例如：美股、A股"
                  value={newGroupCategory}
                  onChange={(e) => setNewGroupCategory(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreate} disabled={isLoading}>
                  <Save className="h-4 w-4 mr-2" />
                  创建
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreating(false);
                    setNewGroupName('');
                    setNewGroupCategory('');
                  }}
                  disabled={isLoading}
                >
                  <X className="h-4 w-4 mr-2" />
                  取消
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* 分组列表 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {groups.map((group) => (
          <Card key={group.id}>
            <CardHeader>
              {editingId === group.id ? (
                <div className="space-y-3">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="分组名称"
                    disabled={isLoading}
                  />
                  <Input
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    placeholder="分类（可选）"
                    disabled={isLoading}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleUpdate(group.id)}
                      disabled={isLoading}
                    >
                      <Save className="h-3 w-3 mr-1" />
                      保存
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={cancelEdit}
                      disabled={isLoading}
                    >
                      <X className="h-3 w-3 mr-1" />
                      取消
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle>{group.name}</CardTitle>
                      {group.category && (
                        <CardDescription className="mt-1">
                          {group.category}
                        </CardDescription>
                      )}
                    </div>
                    {group.isSystem && (
                      <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                        系统
                      </span>
                    )}
                  </div>
                </>
              )}
            </CardHeader>

            <CardContent>
              <div className="flex items-center justify-between">
                <button
                  onClick={() => openViewStocksDialog(group.id, group.name)}
                  disabled={isLoading}
                  className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-300 transition-colors"
                >
                  <TrendingUp className="h-4 w-4" />
                  <span>{group.symbolCount} 支股票</span>
                  <Eye className="h-3 w-3" />
                </button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => openAddStockDialog(group.id, group.name)}
                  disabled={isLoading}
                  className="text-teal-400 hover:text-teal-300 hover:bg-teal-400/10"
                >
                  <PlusCircle className="h-4 w-4 mr-1" />
                  添加股票
                </Button>
              </div>
            </CardContent>

            {editingId !== group.id && (
              <CardFooter>
                <div className="flex gap-2 w-full">
                  {!group.isSystem && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEdit(group)}
                        disabled={isLoading}
                        className="flex-1"
                      >
                        <Edit2 className="h-3 w-3 mr-1" />
                        编辑
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(group.id, group.name)}
                        disabled={isLoading}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                  {group.isSystem && (
                    <div className="text-xs text-gray-500 flex-1">
                      系统分组不可编辑或删除
                    </div>
                  )}
                </div>
              </CardFooter>
            )}
          </Card>
        ))}
      </div>

      {groups.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-400">
              <p className="text-lg mb-2">还没有创建任何分组</p>
              <p className="text-sm">点击"创建新分组"开始</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 添加股票对话框 */}
      {selectedGroupForAdd && (
        <AddStockToGroup
          open={addStockDialogOpen}
          onOpenChange={setAddStockDialogOpen}
          groupId={selectedGroupForAdd.id}
          groupName={selectedGroupForAdd.name}
          userId={userId}
          onStockAdded={refreshGroups}
        />
      )}

      {/* 查看股票对话框 */}
      {selectedGroupForView && (
        <ViewGroupStocks
          open={viewStocksDialogOpen}
          onOpenChange={setViewStocksDialogOpen}
          groupId={selectedGroupForView.id}
          groupName={selectedGroupForView.name}
          stocks={selectedGroupForView.stocks}
          userId={userId}
          onStockRemoved={() => {
            refreshGroups();
            // 重新加载当前查看的分组
            openViewStocksDialog(selectedGroupForView.id, selectedGroupForView.name);
          }}
        />
      )}
    </div>
  );
}

