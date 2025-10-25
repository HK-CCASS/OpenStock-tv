/**
 * Mock TradingView Ticker - 用于测试和演示
 * 生成模拟的实时报价更新，即使非交易时间也能看到效果
 */

import { TickerState, TickerCallback } from './ticker';

export class MockTradingViewTicker {
  private symbols: string[];
  private states: Map<string, TickerState> = new Map();
  private callback: TickerCallback | null = null;
  private updateInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private verbose: boolean = false;

  constructor(symbols: string | string[], verbose: boolean = false) {
    this.symbols = Array.isArray(symbols) ? symbols : [symbols];
    this.verbose = verbose;
    
    // 初始化模拟价格
    this.symbols.forEach(symbol => {
      const basePrice = this.getBasePrice(symbol);
      this.states.set(symbol, {
        volume: Math.floor(Math.random() * 50000000) + 10000000,
        price: basePrice,
        change: 0,
        changePercent: 0,
        time: Math.floor(Date.now() / 1000),
      });
    });
  }

  /**
   * 根据股票代码获取基准价格
   */
  private getBasePrice(symbol: string): number {
    const priceMap: Record<string, number> = {
      'NASDAQ:AAPL': 180,
      'NASDAQ:MSFT': 380,
      'NASDAQ:GOOGL': 140,
      'NASDAQ:TSLA': 250,
      'NASDAQ:META': 470,
      'NASDAQ:NVDA': 500,
      'NASDAQ:AMZN': 175,
      'NASDAQ:NFLX': 450,
      'NYSE:JPM': 150,
      'NYSE:BAC': 35,
      'NYSE:WFC': 45,
      'NYSE:GS': 400,
      'NYSE:DIS': 95,
    };

    return priceMap[symbol] || 100 + Math.random() * 400;
  }

  /**
   * 启动模拟 Ticker
   */
  public async start(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;

    if (this.verbose) {
      console.log('[Mock Ticker] Starting with', this.symbols.length, 'symbols');
    }

    // 模拟连接延迟
    await new Promise(resolve => setTimeout(resolve, 500));

    // 开始生成模拟更新（每1-3秒随机更新一个股票）
    this.updateInterval = setInterval(() => {
      this.generateRandomUpdate();
    }, 1000 + Math.random() * 2000);

    if (this.verbose) {
      console.log('[Mock Ticker] Started successfully');
    }
  }

  /**
   * 生成随机更新
   */
  private generateRandomUpdate(): void {
    // 随机选择一个股票
    const symbol = this.symbols[Math.floor(Math.random() * this.symbols.length)];
    const state = this.states.get(symbol);
    
    if (!state) return;

    // 模拟价格变化（-2% 到 +2%）
    const priceChange = (Math.random() - 0.5) * 0.04;
    const basePrice = this.getBasePrice(symbol);
    const newPrice = basePrice * (1 + priceChange);
    const newChangePercent = priceChange * 100;
    const newChange = newPrice - basePrice;

    // 模拟成交量变化
    const volumeChange = Math.floor((Math.random() - 0.5) * 1000000);

    // 更新状态
    state.price = parseFloat(newPrice.toFixed(2));
    state.change = parseFloat(newChange.toFixed(2));
    state.changePercent = parseFloat(newChangePercent.toFixed(2));
    state.volume = Math.max(1000000, state.volume + volumeChange);
    state.time = Math.floor(Date.now() / 1000);

    // 触发回调
    if (this.callback) {
      this.callback(symbol, { ...state });
    }

    if (this.verbose) {
      const sign = state.changePercent >= 0 ? '+' : '';
      console.log(
        `[Mock Ticker] ${symbol}: $${state.price.toFixed(2)} (${sign}${state.changePercent.toFixed(2)}%)`
      );
    }
  }

  /**
   * 停止模拟 Ticker
   */
  public stop(): void {
    this.isRunning = false;
    
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    if (this.verbose) {
      console.log('[Mock Ticker] Stopped');
    }
  }

  /**
   * 设置更新回调函数
   */
  public onUpdate(callback: TickerCallback): void {
    this.callback = callback;
  }

  /**
   * 获取所有股票的当前状态
   */
  public getStates(): Map<string, TickerState> {
    return this.states;
  }

  /**
   * 动态添加新的股票代码
   */
  public addSymbols(newSymbols: string[]): void {
    newSymbols.forEach(symbol => {
      if (!this.states.has(symbol)) {
        const basePrice = this.getBasePrice(symbol);
        this.states.set(symbol, {
          volume: Math.floor(Math.random() * 50000000) + 10000000,
          price: basePrice,
          change: 0,
          changePercent: 0,
          time: Math.floor(Date.now() / 1000),
        });
        this.symbols.push(symbol);
      }
    });

    if (this.verbose) {
      console.log(`[Mock Ticker] Added ${newSymbols.length} new symbols`);
    }
  }

  /**
   * 获取订阅的股票代码列表
   */
  public getSymbols(): string[] {
    return [...this.symbols];
  }

  /**
   * 批量生成初始更新（用于快速填充数据）
   */
  public generateInitialUpdates(): void {
    this.symbols.forEach(symbol => {
      const state = this.states.get(symbol);
      if (state && this.callback) {
        this.callback(symbol, { ...state });
      }
    });

    if (this.verbose) {
      console.log(`[Mock Ticker] Generated initial updates for ${this.symbols.length} symbols`);
    }
  }
}

