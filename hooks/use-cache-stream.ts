'use client';

import { useEffect, useRef, useState } from 'react';

interface CacheOverview {
  redis: {
    status: 'connected' | 'disconnected';
    hitRate: number;
    keyCount: number;
    memoryUsage: string;
  };
  mongodb: {
    status: 'connected' | 'error';
    recordCount: number;
    hitRate: number;
    expiredCount: number;
  };
  dataSources: {
    yahoo: { success: number; failed: number; };
    finnhub: { success: number; failed: number; };
    fallback: { count: number; };
  };
  performance: {
    avgResponseTime: number;
    cacheHitTrend: number[];
    topSymbols: string[];
  };
  updatedAt: string;
}

interface DataSourceMetrics {
  overall: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    lastUpdated: string;
  };
  sources: {
    yahoo: {
      requests: number;
      successRate: number;
      avgResponseTime: number;
      errorRate: number;
      totalDataPoints: number;
      status: 'healthy' | 'degraded' | 'unhealthy';
    };
    finnhub: {
      requests: number;
      successRate: number;
      avgResponseTime: number;
      errorRate: number;
      totalDataPoints: number;
      status: 'healthy' | 'degraded' | 'unhealthy';
    };
    fallback: {
      requests: number;
      successRate: number;
      avgResponseTime: number;
      totalDataPoints: number;
      status: 'healthy' | 'degraded' | 'unhealthy';
    };
  };
  trends: {
    hourlyRequests: { hour: string; count: number }[];
    sourceDistribution: { source: string; count: number }[];
  };
  period: string;
}

interface StreamData {
  type: 'connected' | 'initial' | 'update' | 'error';
  data?: {
    overview: CacheOverview;
    metrics: DataSourceMetrics;
  };
  timestamp?: string;
  message?: string;
  error?: string;
}

export function useCacheStream(enabled: boolean = true) {
  const [data, setData] = useState<{
    overview: CacheOverview | null;
    metrics: DataSourceMetrics | null;
  }>({
    overview: null,
    metrics: null,
  });
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!enabled) return;

    // Create EventSource connection
    const eventSource = new EventSource('/api/admin/cache/stream');
    eventSourceRef.current = eventSource;

    // Connection opened
    eventSource.onopen = () => {
      setConnected(true);
      setError(null);
    };

    // Receive message
    eventSource.onmessage = (event) => {
      try {
        const streamData: StreamData = JSON.parse(event.data);

        switch (streamData.type) {
          case 'connected':
            console.log('Cache stream connected:', streamData.message);
            break;

          case 'initial':
          case 'update':
            if (streamData.data) {
              setData({
                overview: streamData.data.overview,
                metrics: streamData.data.metrics,
              });
            }
            break;

          case 'error':
            setError(streamData.message || 'Stream error');
            console.error('Cache stream error:', streamData.error);
            break;
        }
      } catch (err) {
        console.error('Failed to parse stream data:', err);
        setError('Invalid data received');
      }
    };

    // Handle errors
    eventSource.onerror = (err) => {
      console.error('EventSource error:', err);
      setError('Connection lost');
      setConnected(false);

      // Attempt to reconnect after 5 seconds
      setTimeout(() => {
        if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
          eventSourceRef.current = null;
          // Trigger re-connection by updating state
          setConnected(false);
        }
      }, 5000);
    };

    // Cleanup
    return () => {
      eventSource.close();
      eventSourceRef.current = null;
      setConnected(false);
    };
  }, [enabled]);

  // Reconnect when connection is lost
  useEffect(() => {
    if (!connected && !enabled && eventSourceRef.current === null) {
      // Force re-render to trigger reconnection
      const timer = setTimeout(() => {
        if (!enabled) return;
        // Re-establish connection
        const eventSource = new EventSource('/api/admin/cache/stream');
        eventSourceRef.current = eventSource;
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [connected, enabled]);

  return {
    data: data.overview && data.metrics ? { ...data, overview: data.overview, metrics: data.metrics } : null,
    connected,
    error,
  };
}
