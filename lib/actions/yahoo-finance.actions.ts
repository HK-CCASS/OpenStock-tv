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
 * 从 Yahoo Finance 批量获取股票报价和市值
 * @param symbols - 股票代码数组（每批最多 100 个）
 */
export async function getBatchQuotesFromYahoo(
  symbols: string[]
): Promise<Map<string, YahooQuoteData>> {
  if (symbols.length === 0) {
    return new Map();
  }

  const resultMap = new Map<string, YahooQuoteData>();

  try {
    const quotes = await yahooFinance.quote(symbols, {
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

      const symbol = quote.symbol.toUpperCase();
      const price = quote.regularMarketPrice || 0;
      const previousClose = quote.regularMarketPreviousClose || price;

      resultMap.set(symbol, {
        symbol,
        price,
        change: quote.regularMarketChange || (price - previousClose),
        changePercent: quote.regularMarketChangePercent || 0,
        marketCap: quote.marketCap || 0,
        volume: quote.regularMarketVolume || 0,
        previousClose,
      });
    });

    console.log(
      `[Yahoo Finance] ✅ Fetched ${resultMap.size}/${symbols.length} quotes`
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

  for (const symbol of symbols) {
    try {
      const quote = await yahooFinance.quote(symbol);
      
      if (!quote) continue;

      const price = quote.regularMarketPrice || 0;
      const previousClose = quote.regularMarketPreviousClose || price;

      resultMap.set(symbol.toUpperCase(), {
        symbol: symbol.toUpperCase(),
        price,
        change: quote.regularMarketChange || (price - previousClose),
        changePercent: quote.regularMarketChangePercent || 0,
        marketCap: quote.marketCap || 0,
        volume: quote.regularMarketVolume || 0,
        previousClose,
      });
    } catch (error) {
      console.warn(`[Yahoo Finance] ⚠️ Failed to fetch ${symbol}`);
    }
  }

  console.log(
    `[Yahoo Finance] Fallback: fetched ${resultMap.size}/${symbols.length} quotes`
  );

  return resultMap;
}

/**
 * 验证市值数据有效性（100万 ~ 10万亿美元）
 * 注意：虽然这是同步函数，但在 Server Actions 文件中必须声明为 async
 */
export async function isValidMarketCap(marketCap: number): Promise<boolean> {
  return marketCap > 1000000 && marketCap < 10000000000000;
}

