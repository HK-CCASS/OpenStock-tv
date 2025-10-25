// TradingView WebSocket 实时数据连接配置
// 用于获取股票实时价格更新

interface QuoteUpdate {
  type: 'quote_update';
  symbol: string;
  last: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: number;
}

interface WebSocketMessage {
  type: string;
  symbols?: string[];
  data?: any;
}

export class TradingViewWebSocket {
  private ws: WebSocket | null = null;
  private reconnectInterval: NodeJS.Timeout | null = null;
  private onUpdateCallback: ((update: QuoteUpdate) => void) | null = null;
  private subscribedSymbols: Set<string> = new Set();
  
  constructor(private url: string = 'ws://localhost:8001/ws') {}
  
  // 连接到WebSocket服务器
  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }
    
    try {
      this.ws = new WebSocket(this.url);
      
      this.ws.onopen = () => {
        console.log('TradingView WebSocket connected');
        // 重新订阅之前的股票代码
        if (this.subscribedSymbols.size > 0) {
          this.subscribe(Array.from(this.subscribedSymbols));
        }
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'quote_update' && this.onUpdateCallback) {
            this.onUpdateCallback(data as QuoteUpdate);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      this.ws.onclose = () => {
        console.log('WebSocket disconnected, attempting to reconnect...');
        this.scheduleReconnect();
      };
      
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      this.scheduleReconnect();
    }
  }
  
  // 订阅股票代码
  subscribe(symbols: string[]) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected, storing symbols for later');
      symbols.forEach(s => this.subscribedSymbols.add(s));
      return;
    }
    
    symbols.forEach(s => this.subscribedSymbols.add(s));
    
    const message: WebSocketMessage = {
      type: 'subscribe',
      symbols: symbols
    };
    
    this.ws.send(JSON.stringify(message));
    console.log(`Subscribed to ${symbols.length} symbols`);
  }
  
  // 取消订阅股票代码
  unsubscribe(symbols: string[]) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    
    symbols.forEach(s => this.subscribedSymbols.delete(s));
    
    const message: WebSocketMessage = {
      type: 'unsubscribe',
      symbols: symbols
    };
    
    this.ws.send(JSON.stringify(message));
  }
  
  // 设置数据更新回调
  onUpdate(callback: (update: QuoteUpdate) => void) {
    this.onUpdateCallback = callback;
  }
  
  // 断开连接
  disconnect() {
    if (this.reconnectInterval) {
      clearTimeout(this.reconnectInterval);
      this.reconnectInterval = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.subscribedSymbols.clear();
  }
  
  // 计划重连
  private scheduleReconnect() {
    if (this.reconnectInterval) return;
    
    this.reconnectInterval = setTimeout(() => {
      this.reconnectInterval = null;
      this.connect();
    }, 5000); // 5秒后重连
  }
}

// 使用示例：
// 
// const wsClient = new TradingViewWebSocket('ws://localhost:8001/ws');
// 
// wsClient.onUpdate((update) => {
//   console.log(`${update.symbol}: $${update.last} (${update.changePercent}%)`);
//   // 更新你的UI状态
// });
// 
// wsClient.connect();
// wsClient.subscribe(['TSLA', 'AAPL', 'MSFT', 'GOOGL']);
// 
// // 清理时
// wsClient.disconnect();
