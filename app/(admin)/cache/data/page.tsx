'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Filter, Download } from 'lucide-react';

/**
 * Data Management Tab - Cache Data CRUD
 *
 * Provides tools for viewing, editing, and managing cache entries
 * including search, filtering, batch operations, and export.
 */

export default function DataTab() {
  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <Card className="bg-[#1f1f1f] border-[#2a2a2a]">
        <CardHeader>
          <CardTitle className="text-white">缓存数据管理</CardTitle>
          <CardDescription className="text-gray-400">
            查看、编辑和管理市值缓存数据
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="搜索股票代码或公司名称..."
                className="pl-10 bg-[#262626] border-[#2a2a2a] text-white"
              />
            </div>

            {/* Filters */}
            <Button variant="outline" className="border-[#2a2a2a] text-gray-400">
              <Filter className="h-4 w-4 mr-2" />
              过滤
            </Button>

            {/* Export */}
            <Button variant="outline" className="border-[#2a2a2a] text-gray-400">
              <Download className="h-4 w-4 mr-2" />
              导出
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Table Placeholder */}
      <Card className="bg-[#1f1f1f] border-[#2a2a2a]">
        <CardHeader>
          <CardTitle className="text-white">缓存数据</CardTitle>
          <CardDescription className="text-gray-400">
            共 15,678 条记录
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[600px] flex items-center justify-center text-gray-500 border-2 border-dashed border-[#2a2a2a] rounded-lg">
            数据表格即将显示
          </div>
        </CardContent>
      </Card>

      {/* Batch Actions */}
      <Card className="bg-[#1f1f1f] border-[#2a2a2a]">
        <CardHeader>
          <CardTitle className="text-white">批量操作</CardTitle>
          <CardDescription className="text-gray-400">
            选择多条记录执行批量操作
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button variant="destructive" className="bg-red-600 hover:bg-red-700">
              批量删除
            </Button>
            <Button variant="outline" className="border-[#2a2a2a] text-gray-400">
              批量刷新
            </Button>
            <Button variant="outline" className="border-[#2a2a2a] text-gray-400">
              按源清理
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
