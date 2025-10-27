'use server';

import yahooFinance from 'yahoo-finance2';

export interface YahooQuoteData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: number;
  volume: number;
  previousClose: number;
}

/**
 * 转换 TradingView 格式的 symbol 到 Yahoo Finance 格式
 * @param symbol - TradingView 格式的 symbol（如 "NASDAQ:AAPL"）
 * @returns Yahoo Finance 格式的 symbol（如 "AAPL"）
 */
function convertToYahooSymbol(symbol: string): string {
  // 移除交易所前缀（NASDAQ:, NYSE:, etc.）
  const parts = symbol.split(':');
  return parts.length > 1 ? parts[1] : symbol;
}

/**
 * 从 Yahoo Finance 批量获取股票报价和市值
 * @param symbols - 股票代码数组（TradingView 格式，每批最多 100 个）
 */
export async function getBatchQuotesFromYahoo(
  symbols: string[]
): Promise<Map<string, YahooQuoteData>> {
  if (symbols.length === 0) {
    return new Map();
  }

  const resultMap = new Map<string, YahooQuoteData>();

  // 转换 symbol 格式并建立映射关系
  const symbolMap = new Map<string, string>(); // Yahoo symbol -> TradingView symbol
  const yahooSymbols = symbols.map(s => {
    const yahooSymbol = convertToYahooSymbol(s);
    symbolMap.set(yahooSymbol.toUpperCase(), s.toUpperCase());
    return yahooSymbol;
  });

  try {
    const quotes = await yahooFinance.quote(yahooSymbols, {
      fields: [
        'symbol',
        'regularMarketPrice',
        'regularMarketChange',
        'regularMarketChangePercent',
        'marketCap',
        'regularMarketVolume',
        'regularMarketPreviousClose',
      ],
    });

    const quotesArray = Array.isArray(quotes) ? quotes : [quotes];

    quotesArray.forEach((quote: any) => {
      if (!quote || !quote.symbol) return;

      const yahooSymbol = quote.symbol.toUpperCase();
      // 转换回 TradingView 格式的 symbol
      const tradingViewSymbol = symbolMap.get(yahooSymbol) || yahooSymbol;
      
      const price = quote.regularMarketPrice || 0;
      const previousClose = quote.regularMarketPreviousClose || price;

      resultMap.set(tradingViewSymbol, {
        symbol: tradingViewSymbol,
        price,
        change: quote.regularMarketChange || (price - previousClose),
        changePercent: quote.regularMarketChangePercent || 0,
        marketCap: quote.marketCap || 0,
        volume: quote.regularMarketVolume || 0,
        previousClose,
      });
    });

    // 临时调试日志：查看 Yahoo Finance 使用情况
    console.log(
      `[Yahoo Finance] ✅ Fetched ${resultMap.size}/${symbols.length} quotes | ` +
      `Symbols: ${Array.from(resultMap.keys()).slice(0, 5).join(', ')}${resultMap.size > 5 ? '...' : ''}`
    );

    return resultMap;
  } catch (error) {
    console.error('[Yahoo Finance] ⚠️ Batch query failed:', error);
    return await fetchSymbolsOneByOne(symbols);
  }
}

/**
 * 单个查询回退机制（批量失败时使用）
 */
async function fetchSymbolsOneByOne(
  symbols: string[]
): Promise<Map<string, YahooQuoteData>> {
  const resultMap = new Map<string, YahooQuoteData>();

  for (const tvSymbol of symbols) {
    try {
      const yahooSymbol = convertToYahooSymbol(tvSymbol);
      const quote = await yahooFinance.quote(yahooSymbol);
      
      if (!quote) continue;

      const price = quote.regularMarketPrice || 0;
      const previousClose = quote.regularMarketPreviousClose || price;

      resultMap.set(tvSymbol.toUpperCase(), {
        symbol: tvSymbol.toUpperCase(),
        price,
        change: quote.regularMarketChange || (price - previousClose),
        changePercent: quote.regularMarketChangePercent || 0,
        marketCap: quote.marketCap || 0,
        volume: quote.regularMarketVolume || 0,
        previousClose,
      });
    } catch (error) {
      // 性能优化：禁用单个股票失败日志（高频）
      // console.warn(`[Yahoo Finance] ⚠️ Failed to fetch ${tvSymbol}`);
    }
  }

  // 性能优化：禁用回退模式日志
  // console.log(
  //   `[Yahoo Finance] Fallback: fetched ${resultMap.size}/${symbols.length} quotes`
  // );

  return resultMap;
}

/**
 * 验证市值数据有效性（100万 ~ 10万亿美元）
 * 注意：虽然这是同步函数，但在 Server Actions 文件中必须声明为 async
 */
export async function isValidMarketCap(marketCap: number): Promise<boolean> {
  return marketCap > 1000000 && marketCap < 10000000000000;
}

