/**
 * SSE Manager - 管理 TradingView Ticker 和 SSE 客户端连接
 * 单例模式，全局共享一个 TradingView WebSocket 连接
 */

import { TradingViewTicker, TickerState } from './ticker';
import { MockTradingViewTicker } from './mock-ticker';

// 测试模式开关（设置环境变量 USE_MOCK_TICKER=true 启用）
// 默认使用真实 TradingView Ticker，显式设置 USE_MOCK_TICKER=true 启用模拟数据
const USE_MOCK_TICKER = process.env.USE_MOCK_TICKER === 'true';

interface SSEClient {
  controller: ReadableStreamDefaultController;
  encoder: TextEncoder;
  symbols: Set<string>;
}

class SSEManager {
  private static instance: SSEManager | null = null;
  private ticker: TradingViewTicker | null = null;
  private clients: Map<string, SSEClient> = new Map();
  private symbolSubscribers: Map<string, Set<string>> = new Map();
  private isTickerRunning: boolean = false;

  private constructor() {}

  /**
   * 获取单例实例
   */
  public static getInstance(): SSEManager {
    if (!SSEManager.instance) {
      SSEManager.instance = new SSEManager();
    }
    return SSEManager.instance;
  }

  /**
   * 订阅客户端
   */
  public subscribeClient(
    clientId: string,
    symbols: string[],
    controller: ReadableStreamDefaultController
  ): void {
    // 创建客户端记录
    const client: SSEClient = {
      controller,
      encoder: new TextEncoder(),
      symbols: new Set(symbols),
    };
    
    this.clients.set(clientId, client);

    // 更新股票订阅计数
    symbols.forEach(symbol => {
      if (!this.symbolSubscribers.has(symbol)) {
        this.symbolSubscribers.set(symbol, new Set());
      }
      this.symbolSubscribers.get(symbol)!.add(clientId);
    });

    console.log(`[SSE] Client ${clientId} subscribed to ${symbols.length} symbols`);

    // 如果 Ticker 未运行，启动它
    if (!this.isTickerRunning) {
      this.startTicker();
    } else if (this.ticker) {
      // 如果 Ticker 已运行，添加新的股票代码
      const currentSymbols = this.ticker.getSymbols();
      const newSymbols = symbols.filter(s => !currentSymbols.includes(s));
      if (newSymbols.length > 0) {
        this.ticker.addSymbols(newSymbols);
      }
    }
  }

  /**
   * 取消订阅客户端
   */
  public unsubscribeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // 移除客户端
    this.clients.delete(clientId);

    // 更新股票订阅计数
    client.symbols.forEach(symbol => {
      const subscribers = this.symbolSubscribers.get(symbol);
      if (subscribers) {
        subscribers.delete(clientId);
        if (subscribers.size === 0) {
          this.symbolSubscribers.delete(symbol);
        }
      }
    });

    console.log(`[SSE] Client ${clientId} unsubscribed`);

    // 如果没有客户端了，停止 Ticker
    if (this.clients.size === 0) {
      this.stopTicker();
    }
  }

  /**
   * 启动 TradingView Ticker
   */
  private async startTicker(): Promise<void> {
    if (this.isTickerRunning) return;

    // 收集所有需要订阅的股票代码
    const allSymbols = Array.from(this.symbolSubscribers.keys());
    if (allSymbols.length === 0) return;

    const tickerType = USE_MOCK_TICKER ? 'Mock Ticker' : 'TradingView Ticker';
    console.log(`[SSE] Starting ${tickerType} with ${allSymbols.length} symbols`);

    try {
      // 根据配置选择 Ticker 类型
      if (USE_MOCK_TICKER) {
        this.ticker = new MockTradingViewTicker(allSymbols, true) as any;
      } else {
        this.ticker = new TradingViewTicker(allSymbols, true);
      }
      
      // 设置更新回调
      this.ticker.onUpdate((symbol: string, state: TickerState) => {
        this.broadcastUpdate(symbol, state);
      });

      // 启动 Ticker
      await this.ticker.start();
      this.isTickerRunning = true;
      
      // Mock Ticker 立即发送初始数据
      if (USE_MOCK_TICKER && 'generateInitialUpdates' in this.ticker) {
        setTimeout(() => {
          (this.ticker as any).generateInitialUpdates();
        }, 1000);
      }
      
      console.log(`[SSE] ${tickerType} started successfully`);
    } catch (error) {
      console.error(`[SSE] Failed to start ${tickerType}:`, error);
      this.isTickerRunning = false;
      this.ticker = null;
    }
  }

  /**
   * 停止 TradingView Ticker
   */
  private stopTicker(): void {
    if (!this.isTickerRunning || !this.ticker) return;

    console.log('[SSE] Stopping TradingView Ticker');
    
    this.ticker.stop();
    this.ticker = null;
    this.isTickerRunning = false;
  }

  /**
   * 广播更新到所有订阅的客户端
   */
  private broadcastUpdate(symbol: string, state: TickerState): void {
    const subscribers = this.symbolSubscribers.get(symbol);
    if (!subscribers || subscribers.size === 0) return;

    const updateData = {
      symbol,
      price: state.price,
      change: state.change,
      changePercent: state.changePercent,
      volume: state.volume,
      time: state.time,
    };

    const message = `data: ${JSON.stringify(updateData)}\n\n`;

    subscribers.forEach(clientId => {
      const client = this.clients.get(clientId);
      if (client) {
        try {
          client.controller.enqueue(client.encoder.encode(message));
        } catch (error) {
          console.error(`[SSE] Failed to send to client ${clientId}:`, error);
          // 如果发送失败，移除该客户端
          this.unsubscribeClient(clientId);
        }
      }
    });
  }

  /**
   * 获取当前状态统计
   */
  public getStats(): {
    clientCount: number;
    symbolCount: number;
    isTickerRunning: boolean;
  } {
    return {
      clientCount: this.clients.size,
      symbolCount: this.symbolSubscribers.size,
      isTickerRunning: this.isTickerRunning,
    };
  }

  /**
   * 发送初始状态到客户端
   */
  public sendInitialStates(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client || !this.ticker) return;

    const states = this.ticker.getStates();
    
    client.symbols.forEach(symbol => {
      const state = states.get(symbol);
      if (state && state.price > 0) {
        const updateData = {
          symbol,
          price: state.price,
          change: state.change,
          changePercent: state.changePercent,
          volume: state.volume,
          time: state.time,
        };
        
        const message = `data: ${JSON.stringify(updateData)}\n\n`;
        
        try {
          client.controller.enqueue(client.encoder.encode(message));
        } catch (error) {
          console.error(`[SSE] Failed to send initial state to client ${clientId}:`, error);
        }
      }
    });
  }
}

export default SSEManager.getInstance();

