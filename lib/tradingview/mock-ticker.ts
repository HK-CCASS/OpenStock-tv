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
      // 科技股 (NASDAQ) - 大盘股
      'NASDAQ:AAPL': 180,   // Apple
      'NASDAQ:MSFT': 380,   // Microsoft
      'NASDAQ:GOOGL': 140,  // Google (Class A)
      'NASDAQ:GOOG': 140,   // Google (Class C)
      'NASDAQ:AMZN': 175,   // Amazon
      'NASDAQ:META': 470,   // Meta (Facebook)
      'NASDAQ:NVDA': 500,   // NVIDIA
      'NASDAQ:TSLA': 250,   // Tesla
      'NASDAQ:NFLX': 450,   // Netflix
      
      // 科技股 (NASDAQ) - 中大盘股
      'NASDAQ:AMD': 140,    // AMD
      'NASDAQ:INTC': 45,    // Intel
      'NASDAQ:AVGO': 900,   // Broadcom
      'NASDAQ:ADBE': 580,   // Adobe
      'NASDAQ:CRM': 220,    // Salesforce
      'NASDAQ:ORCL': 115,   // Oracle
      'NASDAQ:CSCO': 50,    // Cisco
      'NASDAQ:QCOM': 175,   // Qualcomm
      'NASDAQ:TXN': 180,    // Texas Instruments
      'NASDAQ:INTU': 620,   // Intuit
      
      // 科技股 (NASDAQ) - 中小盘股
      'NASDAQ:PYPL': 65,    // PayPal
      'NASDAQ:SHOP': 80,    // Shopify
      'NASDAQ:COIN': 185,   // Coinbase
      'NASDAQ:ROKU': 75,    // Roku
      'NASDAQ:DDOG': 110,   // Datadog
      'NASDAQ:SNOW': 175,   // Snowflake
      'NASDAQ:ZM': 70,      // Zoom
      'NASDAQ:DOCU': 60,    // DocuSign
      'NASDAQ:CRWD': 260,   // CrowdStrike
      'NASDAQ:PANW': 280,   // Palo Alto Networks
      
      // 金融股 (NYSE)
      'NYSE:JPM': 150,      // JPMorgan Chase
      'NYSE:BAC': 35,       // Bank of America
      'NYSE:WFC': 45,       // Wells Fargo
      'NYSE:GS': 400,       // Goldman Sachs
      'NYSE:MS': 85,        // Morgan Stanley
      'NYSE:C': 55,         // Citigroup
      'NYSE:BLK': 750,      // BlackRock
      'NYSE:SCHW': 65,      // Charles Schwab
      'NYSE:AXP': 180,      // American Express
      'NYSE:V': 265,        // Visa
      'NYSE:MA': 450,       // Mastercard
      
      // 消费股
      'NYSE:WMT': 165,      // Walmart
      'NYSE:HD': 350,       // Home Depot
      'NYSE:KO': 60,        // Coca-Cola
      'NYSE:PEP': 175,      // PepsiCo
      'NYSE:MCD': 290,      // McDonald's
      'NASDAQ:SBUX': 95,    // Starbucks
      'NYSE:NKE': 105,      // Nike
      'NYSE:DIS': 95,       // Disney
      'NYSE:TGT': 150,      // Target
      'NYSE:COST': 730,     // Costco
      
      // 医疗健康股
      'NYSE:JNJ': 165,      // Johnson & Johnson
      'NYSE:UNH': 520,      // UnitedHealth
      'NYSE:PFE': 30,       // Pfizer
      'NYSE:ABBV': 170,     // AbbVie
      'NYSE:TMO': 540,      // Thermo Fisher
      'NYSE:ABT': 110,      // Abbott Laboratories
      'NYSE:MRK': 115,      // Merck
      'NYSE:LLY': 780,      // Eli Lilly
      'NASDAQ:AMGN': 290,   // Amgen
      'NASDAQ:GILD': 75,    // Gilead
      
      // 能源股
      'NYSE:XOM': 110,      // ExxonMobil
      'NYSE:CVX': 150,      // Chevron
      'NYSE:COP': 110,      // ConocoPhillips
      'NYSE:SLB': 50,       // Schlumberger
      'NYSE:PSX': 145,      // Phillips 66
      
      // 工业股
      'NYSE:BA': 190,       // Boeing
      'NYSE:CAT': 340,      // Caterpillar
      'NYSE:GE': 160,       // General Electric
      'NYSE:MMM': 95,       // 3M
      'NYSE:HON': 205,      // Honeywell
      'NYSE:LMT': 470,      // Lockheed Martin
      'NYSE:UPS': 145,      // UPS
      
      // 通信股
      'NYSE:T': 22,         // AT&T
      'NASDAQ:CMCSA': 42,   // Comcast
      'NYSE:VZ': 42,        // Verizon
      'NASDAQ:TMUS': 175,   // T-Mobile
      
      // 房地产/REITs
      'NYSE:AMT': 195,      // American Tower
      'NYSE:PLD': 115,      // Prologis
      'NYSE:SPG': 155,      // Simon Property
      
      // 其他
      'NYSE:BRK.B': 420,    // Berkshire Hathaway B
      'NYSE:TSM': 155,      // Taiwan Semiconductor
    };

    return priceMap[symbol] || 100 + Math.random() * 400;
  }

  /**
   * 启动模拟 Ticker
   */
  public async start(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;

    // 性能优化：禁用启动日志
    // if (this.verbose) {
    //   console.log('[Mock Ticker] Starting with', this.symbols.length, 'symbols');
    // }

    // 模拟连接延迟
    await new Promise(resolve => setTimeout(resolve, 500));

    // 开始生成模拟更新（每1-3秒随机更新一个股票）
    this.updateInterval = setInterval(() => {
      this.generateRandomUpdate();
    }, 1000 + Math.random() * 2000);

    // 性能优化：禁用启动成功日志
    // if (this.verbose) {
    //   console.log('[Mock Ticker] Started successfully');
    // }
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

    // 性能优化：禁用股价更新日志（超高频！每1-3秒触发）
    // if (this.verbose) {
    //   const sign = state.changePercent >= 0 ? '+' : '';
    //   console.log(
    //     `[Mock Ticker] ${symbol}: $${state.price.toFixed(2)} (${sign}${state.changePercent.toFixed(2)}%)`
    //   );
    // }
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

    // 性能优化：禁用停止日志
    // if (this.verbose) {
    //   console.log('[Mock Ticker] Stopped');
    // }
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
  public async addSymbols(newSymbols: string[]): Promise<void> {
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

    // 性能优化：禁用动态添加日志
    // if (this.verbose) {
    //   console.log(`[Mock Ticker] Added ${newSymbols.length} new symbols`);
    // }
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

    // 性能优化：禁用初始更新日志
    // if (this.verbose) {
    //   console.log(`[Mock Ticker] Generated initial updates for ${this.symbols.length} symbols`);
    // }
  }
}

