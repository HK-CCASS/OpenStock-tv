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
  private static readonly BATCH_SIZE = 50; // 每批订阅 50 支股票
  private static readonly BATCH_DELAY = 200; // 批次间延迟 200ms
  private statusLogTimer: NodeJS.Timeout | null = null; // 状态日志定时器

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
   * 支持分批订阅（每批 50 支股票）
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

    // 分批订阅股票（每批 50 支，避免单次订阅过多）
    await this.subscribeSymbolsInBatches(this.symbols, qs, qsl);

    // 性能优化：禁用订阅完成日志
    // if (this.verbose) {
    //   console.log(`[TradingView] Subscribed to ${this.symbols.length} symbols in ${Math.ceil(this.symbols.length / TradingViewTicker.BATCH_SIZE)} batches`);
    // }
  }

  /**
   * 分批订阅股票
   * @param symbols 要订阅的股票列表
   * @param qs quote session ID
   * @param qsl quote session list ID
   */
  private async subscribeSymbolsInBatches(
    symbols: string[],
    qs: string,
    qsl: string
  ): Promise<void> {
    const totalBatches = Math.ceil(symbols.length / TradingViewTicker.BATCH_SIZE);

    for (let i = 0; i < symbols.length; i += TradingViewTicker.BATCH_SIZE) {
      const batch = symbols.slice(i, i + TradingViewTicker.BATCH_SIZE);
      const batchIndex = Math.floor(i / TradingViewTicker.BATCH_SIZE) + 1;

      // 发送订阅消息
      this.sendMessage('quote_add_symbols', [qsl, ...batch]);
      this.sendMessage('quote_fast_symbols', [qs, ...batch]);

      // 性能优化：禁用批次日志
      // if (this.verbose) {
      //   console.log(`[TradingView] Batch ${batchIndex}/${totalBatches}: Subscribed ${batch.length} symbols`);
      // }

      // 批次间延迟（除了最后一批）
      if (i + TradingViewTicker.BATCH_SIZE < symbols.length) {
        await new Promise(resolve => setTimeout(resolve, TradingViewTicker.BATCH_DELAY));
      }
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

      // 性能优化：禁用股价更新日志（超高频！每秒可能几十上百条）
      // if (this.verbose) {
      //   console.log(`[TradingView] ${symbol}: $${state.price.toFixed(2)} (${state.changePercent >= 0 ? '+' : ''}${state.changePercent.toFixed(2)}%)`);
      // }
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
          // 性能优化：禁用连接成功日志
          // if (this.verbose) {
          //   console.log('[TradingView] WebSocket connected');
          // }
          await this.authenticate();
          
          // 启动定期状态日志输出（每60秒）
          this.startStatusLog();
          
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
          // 性能优化：禁用关闭日志
          // if (this.verbose) {
          //   console.log('[TradingView] WebSocket closed');
          // }
          
          // 自动重连
          if (this.isRunning) {
            // 性能优化：禁用重连日志
            // if (this.verbose) {
            //   console.log('[TradingView] Reconnecting in 5 seconds...');
            // }
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

    // 停止状态日志
    this.stopStatusLog();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    // 性能优化：禁用停止日志
    // if (this.verbose) {
    //   console.log('[TradingView] Stopped');
    // }
  }

  /**
   * 开始定期输出订阅状态日志（每60秒）
   */
  private startStatusLog(): void {
    if (this.statusLogTimer) return;

    // 立即输出一次
    this.logSubscriptionStatus();

    // 每60秒输出一次
    this.statusLogTimer = setInterval(() => {
      this.logSubscriptionStatus();
    }, 60000);
  }

  /**
   * 停止状态日志输出
   */
  private stopStatusLog(): void {
    if (this.statusLogTimer) {
      clearInterval(this.statusLogTimer);
      this.statusLogTimer = null;
    }
  }

  /**
   * 输出订阅状态日志
   */
  private logSubscriptionStatus(): void {
    const now = Date.now();
    const totalSymbols = this.symbols.length;
    
    // 统计订阅状态
    const activeSymbols: string[] = []; // 接收过更新的
    const neverUpdatedSymbols: string[] = []; // 从未更新的
    const staleSymbols: string[] = []; // 超过10分钟未更新的

    this.symbols.forEach(symbol => {
      const state = this.states.get(symbol);
      if (!state) {
        neverUpdatedSymbols.push(symbol);
        return;
      }

      if (!state.lastUpdate || state.lastUpdate === 0) {
        neverUpdatedSymbols.push(symbol);
      } else if (now - state.lastUpdate > 10 * 60 * 1000) {
        staleSymbols.push(symbol);
      } else {
        activeSymbols.push(symbol);
      }
    });

    // 输出日志
    console.log('\n========== TradingView 订阅状态 ==========');
    console.log(`📊 总订阅数: ${totalSymbols}`);
    console.log(`✅ 活跃订阅: ${activeSymbols.length} (${((activeSymbols.length / totalSymbols) * 100).toFixed(1)}%)`);
    console.log(`⚠️  过期订阅: ${staleSymbols.length} (>10分钟未更新)`);
    console.log(`❌ 失败订阅: ${neverUpdatedSymbols.length} (从未接收更新)`);
    
    if (neverUpdatedSymbols.length > 0) {
      console.log(`\n失败的 Symbol (前10个):`);
      neverUpdatedSymbols.slice(0, 10).forEach(s => console.log(`  - ${s}`));
      if (neverUpdatedSymbols.length > 10) {
        console.log(`  ... 还有 ${neverUpdatedSymbols.length - 10} 个`);
      }
    }

    if (staleSymbols.length > 0) {
      console.log(`\n过期的 Symbol (前10个):`);
      staleSymbols.slice(0, 10).forEach(s => console.log(`  - ${s}`));
      if (staleSymbols.length > 10) {
        console.log(`  ... 还有 ${staleSymbols.length - 10} 个`);
      }
    }

    console.log('==========================================\n');
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
   * 修复：同时发送 quote_add_symbols 和 quote_fast_symbols，支持分批订阅
   */
  public async addSymbols(newSymbols: string[]): Promise<void> {
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
      
      // 如果 WebSocket 已连接，分批订阅新股票
      if (this.ws?.readyState === WebSocket.OPEN) {
        const q = this.createRandomToken();
        const qs = 'qs_' + q;
        const qsl = 'qs_snapshoter_basic-symbol-quotes_' + q;
        
        // ✅ 分批订阅新增股票（与初始订阅保持一致）
        await this.subscribeSymbolsInBatches(added, qs, qsl);
        
        // 性能优化：禁用动态添加日志
        // if (this.verbose) {
        //   const batches = Math.ceil(added.length / TradingViewTicker.BATCH_SIZE);
        //   console.log(`[TradingView] Added ${added.length} new symbols in ${batches} batch(es)`);
        // }
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

  /**
   * 自动修复：重新订阅未接收更新的股票
   * 返回重新订阅的股票数量
   */
  public autoRepairSubscriptions(): number {
    const stats = this.getSubscriptionStats();
    const now = Date.now();
    const repairThreshold = 10 * 60 * 1000; // 10 分钟

    // 找出需要修复的股票（从未更新 或 超过10分钟未更新）
    const symbolsToRepair: string[] = [];

    this.states.forEach((state, symbol) => {
      const lastUpdate = state.lastUpdate || 0;
      
      // 从未接收更新
      if (lastUpdate === 0) {
        symbolsToRepair.push(symbol);
      }
      // 超过10分钟未更新（可能订阅失效）
      else if (now - lastUpdate > repairThreshold) {
        symbolsToRepair.push(symbol);
      }
    });

    if (symbolsToRepair.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      console.warn(`[TradingView] Auto-repairing ${symbolsToRepair.length} symbols:`, 
        symbolsToRepair.slice(0, 10));

      // 重新订阅
      const q = this.createRandomToken();
      const qs = 'qs_' + q;
      const qsl = 'qs_snapshoter_basic-symbol-quotes_' + q;

      this.sendMessage('quote_add_symbols', [qsl, ...symbolsToRepair]);
      this.sendMessage('quote_fast_symbols', [qs, ...symbolsToRepair]);

      return symbolsToRepair.length;
    }

    return 0;
  }
}

