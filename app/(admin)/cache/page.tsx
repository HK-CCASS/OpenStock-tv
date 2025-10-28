'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, BarChart3, Shield, Settings, Activity } from 'lucide-react';

// Import tab content components
import DashboardTab from './dashboard/page';
import DataTab from './data/page';
import SourcesTab from './sources/page';
import PerformanceTab from './performance/page';
import OperationsTab from './operations/page';

/**
 * Market Cap Cache Admin Dashboard
 *
 * Main page for managing market capitalization cache data.
 * Provides comprehensive tools for monitoring, managing, and optimizing
 * the dual-layer cache system (Redis L1 + MongoDB L2).
 */

export default function CacheAdminPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b border-[#2a2a2a] pb-4">
        <h1 className="text-3xl font-bold text-white">市值缓存管理</h1>
        <p className="text-gray-400 mt-2">
          监控和管理双层缓存系统（Redis + MongoDB）
        </p>
      </div>

      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 bg-[#1f1f1f] border border-[#2a2a2a]">
          <TabsTrigger
            value="dashboard"
            className="data-[state=active]:bg-[#2a2a2a] data-[state=active]:text-white"
          >
            <Database className="w-4 h-4 mr-2" />
            仪表板
          </TabsTrigger>
          <TabsTrigger
            value="data"
            className="data-[state=active]:bg-[#2a2a2a] data-[state=active]:text-white"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            数据管理
          </TabsTrigger>
          <TabsTrigger
            value="sources"
            className="data-[state=active]:bg-[#2a2a2a] data-[state=active]:text-white"
          >
            <Activity className="w-4 h-4 mr-2" />
            数据源
          </TabsTrigger>
          <TabsTrigger
            value="performance"
            className="data-[state=active]:bg-[#2a2a2a] data-[state=active]:text-white"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            性能统计
          </TabsTrigger>
          <TabsTrigger
            value="operations"
            className="data-[state=active]:bg-[#2a2a2a] data-[state=active]:text-white"
          >
            <Settings className="w-4 h-4 mr-2" />
            缓存操作
          </TabsTrigger>
        </TabsList>

        {/* Tab Content */}
        <div className="mt-6">
          <TabsContent value="dashboard" className="space-y-6">
            <DashboardTab />
          </TabsContent>

          <TabsContent value="data" className="space-y-6">
            <DataTab />
          </TabsContent>

          <TabsContent value="sources" className="space-y-6">
            <SourcesTab />
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <PerformanceTab />
          </TabsContent>

          <TabsContent value="operations" className="space-y-6">
            <OperationsTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
