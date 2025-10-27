/**
 * TradingView WebSocket Ticker Client (JavaScript版本)
 * 从 Python 版本迁移，连接到 TradingView 官方 WebSocket 获取实时报价
 */

import WebSocket from 'ws';

export interface TickerState {
  volume: number;
  price: number;
  change: number;
  changePercent: number;
  time: number;
  lastUpdate?: number; // 最后一次接收数据的时间戳（用于监控）
  updateCount?: number; // 接收更新次数（用于验证订阅）
}

export type TickerCallback = (symbol: string, state: TickerState) => void;

interface TradingViewMessage {
  m?: string;
  p?: any[];
}

export class TradingViewTicker {
  private ws: WebSocket | null = null;
  private symbols: string[];
  private states: Map<string, TickerState> = new Map();
  private callback: TickerCallback | null = null;
  private cs: string = '';
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private verbose: boolean = false;

  constructor(symbols: string | string[], verbose: boolean = false) {
    this.symbols = Array.isArray(symbols) ? symbols : [symbols];
    this.verbose = verbose;
    
    // 初始化所有股票的状态（包含监控字段）
    this.symbols.forEach(symbol => {
      this.states.set(symbol, {
        volume: 0,
        price: 0,
        change: 0,
        changePercent: 0,
        time: 0,
        lastUpdate: 0,
        updateCount: 0,
      });
    });
  }

  /**
   * 生成随机 token
   */
  private createRandomToken(length: number = 12): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length }, () => 
      chars[Math.floor(Math.random() * chars.length)]
    ).join('');
  }

  /**
   * 创建 TradingView 协议消息
   */
  private createMessage(name: string, params: any[]): string {
    const message = JSON.stringify({ m: name, p: params });
    return `~m~${message.length}~m~${message}`;
  }

  /**
   * 发送消息到 TradingView WebSocket
   */
  private sendMessage(name: string, params: any[]): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message = this.createMessage(name, params);
      this.ws.send(message);
    }
  }

  /**
   * 发送认证和订阅消息
   */
  private async authenticate(): Promise<void> {
    this.cs = 'cs_' + this.createRandomToken();

    // 认证
    this.sendMessage('set_auth_token', ['unauthorized_user_token']);
    this.sendMessage('chart_create_session', [this.cs, '']);

    // 创建 quote 会话
    const q = this.createRandomToken();
    const qs = 'qs_' + q;
    const qsl = 'qs_snapshoter_basic-symbol-quotes_' + q;

    this.sendMessage('quote_create_session', [qs]);
    this.sendMessage('quote_create_session', [qsl]);

    // 设置需要的字段
    this.sendMessage('quote_set_fields', [
      qsl,
      'base-currency-logoid', 'ch', 'chp', 'currency-logoid',
      'currency_code', 'currency_id', 'base_currency_id',
      'current_session', 'description', 'exchange', 'format',
      'fractional', 'is_tradable', 'language', 'local_description',
      'listed_exchange', 'logoid', 'lp', 'lp_time', 'minmov',
      'minmove2', 'original_name', 'pricescale', 'pro_name',
      'short_name', 'type', 'typespecs', 'update_mode', 'volume',
      'variable_tick_size', 'value_unit_id',
    ]);

    // 订阅股票
    this.sendMessage('quote_add_symbols', [qsl, ...this.symbols]);
    this.sendMessage('quote_fast_symbols', [qs, ...this.symbols]);

    if (this.verbose) {
      console.log(`[TradingView] Subscribed to ${this.symbols.length} symbols`);
    }
  }

  /**
   * 解析 TradingView 消息
   */
  private parseMessage(message: string): void {
    const parts = message.split('~m~');
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      
      // JSON 消息
      if (part.includes('{') || part.includes('[')) {
        try {
          const data = JSON.parse(part) as TradingViewMessage;
          if (data.m === 'qsd') {
            this.handleTickerData(data);
          }
        } catch (e) {
          // 忽略解析错误
        }
      }
      // 心跳消息
      else if (part.includes('~h~')) {
        this.sendHeartbeat(part);
      }
    }
  }

  /**
   * 发送心跳响应
   */
  private sendHeartbeat(message: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(`~m~${message.length}~m~${message}`);
    }
  }

  /**
   * 处理股票报价数据
   * 添加监控：记录最后更新时间和更新次数
   */
  private handleTickerData(data: TradingViewMessage): void {
    try {
      if (!data.p || data.p.length < 2) return;

      const symbol = data.p[1].n;
      const values = data.p[1].v;

      const state = this.states.get(symbol);
      if (!state) return;

      // 更新状态
      if (values.volume !== undefined) state.volume = values.volume;
      if (values.lp !== undefined) state.price = values.lp;
      if (values.chp !== undefined) state.changePercent = values.chp;
      if (values.ch !== undefined) state.change = values.ch;
      if (values.lp_time !== undefined) state.time = values.lp_time;

      // 监控字段
      state.lastUpdate = Date.now();
      state.updateCount = (state.updateCount || 0) + 1;

      // 触发回调
      if (this.callback) {
        this.callback(symbol, { ...state });
      }

      if (this.verbose) {
        console.log(`[TradingView] ${symbol}: $${state.price.toFixed(2)} (${state.changePercent >= 0 ? '+' : ''}${state.changePercent.toFixed(2)}%)`);
      }
    } catch (error) {
      console.error('[TradingView] Error handling ticker data:', error);
    }
  }

  /**
   * 启动 TradingView Ticker
   */
  public start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.isRunning = true;

      try {
        this.ws = new WebSocket('wss://data.tradingview.com/socket.io/websocket', {
          origin: 'https://data.tradingview.com',
          headers: {
            'Origin': 'https://data.tradingview.com'
          }
        });

        this.ws.on('open', async () => {
          if (this.verbose) {
            console.log('[TradingView] WebSocket connected');
          }
          await this.authenticate();
          resolve();
        });

        this.ws.on('message', (data: WebSocket.Data) => {
          this.parseMessage(data.toString());
        });

        this.ws.on('error', (error) => {
          console.error('[TradingView] WebSocket error:', error);
          if (!this.isRunning) {
            reject(error);
          }
        });

        this.ws.on('close', () => {
          if (this.verbose) {
            console.log('[TradingView] WebSocket closed');
          }
          
          // 自动重连
          if (this.isRunning) {
            if (this.verbose) {
              console.log('[TradingView] Reconnecting in 5 seconds...');
            }
            this.reconnectTimer = setTimeout(() => {
              this.start().catch(err => {
                console.error('[TradingView] Reconnection failed:', err);
              });
            }, 5000);
          }
        });
      } catch (error) {
        console.error('[TradingView] Failed to create WebSocket:', error);
        reject(error);
      }
    });
  }

  /**
   * 停止 TradingView Ticker
   */
  public stop(): void {
    this.isRunning = false;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    if (this.verbose) {
      console.log('[TradingView] Stopped');
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
   * 修复：同时发送 quote_add_symbols 和 quote_fast_symbols
   */
  public addSymbols(newSymbols: string[]): void {
    const added: string[] = [];
    
    newSymbols.forEach(symbol => {
      if (!this.states.has(symbol)) {
        this.states.set(symbol, {
          volume: 0,
          price: 0,
          change: 0,
          changePercent: 0,
          time: 0,
          lastUpdate: 0,
          updateCount: 0,
        });
        added.push(symbol);
      }
    });

    if (added.length > 0) {
      this.symbols.push(...added);
      
      // 如果 WebSocket 已连接，完整订阅新股票
      if (this.ws?.readyState === WebSocket.OPEN) {
        const q = this.createRandomToken();
        const qs = 'qs_' + q;
        const qsl = 'qs_snapshoter_basic-symbol-quotes_' + q;
        
        // ✅ 修复：添加完整订阅（与初始订阅保持一致）
        this.sendMessage('quote_add_symbols', [qsl, ...added]);
        this.sendMessage('quote_fast_symbols', [qs, ...added]);
        
        if (this.verbose) {
          console.log(`[TradingView] Added ${added.length} new symbols`);
        }
      }
    }
  }

  /**
   * 获取订阅的股票代码列表
   */
  public getSymbols(): string[] {
    return [...this.symbols];
  }

  /**
   * 获取订阅状态统计（用于监控和调试）
   * 返回：订阅总数、接收更新的股票数、未接收更新的股票列表
   */
  public getSubscriptionStats(): {
    totalSymbols: number;
    activeSymbols: number; // 接收过更新的股票数
    staleSymbols: string[]; // 超过5分钟未更新的股票
    neverUpdatedSymbols: string[]; // 从未接收过更新的股票
    lastUpdateTimes: Map<string, number>; // 每个股票的最后更新时间
  } {
    const now = Date.now();
    const staleThreshold = 5 * 60 * 1000; // 5 分钟
    
    let activeCount = 0;
    const staleSymbols: string[] = [];
    const neverUpdatedSymbols: string[] = [];
    const lastUpdateTimes = new Map<string, number>();

    this.states.forEach((state, symbol) => {
      const lastUpdate = state.lastUpdate || 0;
      lastUpdateTimes.set(symbol, lastUpdate);

      if (lastUpdate === 0) {
        neverUpdatedSymbols.push(symbol);
      } else {
        activeCount++;
        const timeSinceUpdate = now - lastUpdate;
        if (timeSinceUpdate > staleThreshold) {
          staleSymbols.push(symbol);
        }
      }
    });

    return {
      totalSymbols: this.symbols.length,
      activeSymbols: activeCount,
      staleSymbols,
      neverUpdatedSymbols,
      lastUpdateTimes,
    };
  }

  /**
   * 生产环境监控日志（可选）
   * 只在检测到问题时输出，避免性能影响
   */
  public logSubscriptionHealth(): void {
    const stats = this.getSubscriptionStats();
    
    // 只在有问题时输出
    if (stats.neverUpdatedSymbols.length > 0 || stats.staleSymbols.length > 0) {
      console.warn('[TradingView] Subscription Health Check:', {
        total: stats.totalSymbols,
        active: stats.activeSymbols,
        neverUpdated: stats.neverUpdatedSymbols.length,
        stale: stats.staleSymbols.length,
      });

      if (stats.neverUpdatedSymbols.length > 0) {
        console.warn('[TradingView] Never updated symbols:', stats.neverUpdatedSymbols.slice(0, 10));
      }

      if (stats.staleSymbols.length > 0) {
        console.warn('[TradingView] Stale symbols (>5min):', stats.staleSymbols.slice(0, 10));
      }
    }
  }
}

