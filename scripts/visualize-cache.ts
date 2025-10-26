import 'dotenv/config';  // 显式加载 .env 文件
import { connectToDatabase } from '@/database/mongoose';
import { getRedisClient, isRedisAvailable } from '@/lib/redis/client';
import { writeFileSync } from 'fs';
import { join } from 'path';

/**
 * 生成缓存数据可视化 HTML 报告
 */
async function visualizeCache() {
  console.log('📊 生成缓存数据可视化报告...\n');

  try {
    // 1️⃣ 收集 MongoDB 数据
    await connectToDatabase();
    const { MarketCap } = await import('@/database/models/market-cap.model');

    const now = new Date();
    const totalCount = await MarketCap.countDocuments();
    const validCount = await MarketCap.countDocuments({ validUntil: { $gt: now } });

    const sourceStats = await MarketCap.aggregate([
      { $group: { _id: '$source', count: { $sum: 1 } } },
    ]);

    const allRecords = await MarketCap.find()
      .sort({ lastUpdated: -1 })
      .limit(100)
      .lean();

    // 2️⃣ 收集 Redis 数据
    let redisKeys: string[] = [];
    let redisSamples: any[] = [];

    if (isRedisAvailable()) {
      const redis = getRedisClient();
      if (redis) {
        redisKeys = await redis.keys('marketcap:*');
        const sampleKeys = redisKeys.slice(0, 50);

        for (const key of sampleKeys) {
          const data = await redis.get(key);
          const ttl = await redis.ttl(key);

          if (data) {
            try {
              const parsed = JSON.parse(data);
              redisSamples.push({
                symbol: key.replace('marketcap:', ''),
                ...parsed,
                ttl,
              });
            } catch (err) {
              // 忽略解析错误
            }
          }
        }
      }
    }

    // 3️⃣ 生成 HTML 报告
    const html = generateHTML({
      mongodb: {
        totalCount,
        validCount,
        expiredCount: totalCount - validCount,
        sourceStats,
        records: allRecords,
      },
      redis: {
        totalCount: redisKeys.length,
        samples: redisSamples,
        available: isRedisAvailable(),
      },
      generatedAt: new Date().toLocaleString(),
    });

    // 4️⃣ 保存 HTML 文件
    const outputPath = join(process.cwd(), 'cache-report.html');
    writeFileSync(outputPath, html, 'utf-8');

    console.log('✅ 报告生成成功！');
    console.log(`📄 文件路径: ${outputPath}`);
    console.log('\n🌐 打开报告:');
    console.log(`   open ${outputPath}`);
    console.log('   或者直接在浏览器中打开该文件');
  } catch (error) {
    console.error('\n❌ 生成失败:', error);
    process.exit(1);
  }
}

/**
 * 生成 HTML 报告
 */
function generateHTML(data: any): string {
  const {
    mongodb: { totalCount, validCount, expiredCount, sourceStats, records },
    redis: { totalCount: redisCount, samples, available },
    generatedAt,
  } = data;

  // 当前时间（用于判断缓存是否过期）
  const now = new Date();

  // 计算数据源百分比
  const sourceChartData = sourceStats
    .map((stat: any) => ({
      name: stat._id,
      count: stat.count,
      percentage: ((stat.count / totalCount) * 100).toFixed(1),
    }))
    .sort((a: any, b: any) => b.count - a.count);

  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>市值缓存数据可视化 - OpenStock</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
        }

        h1 {
            color: white;
            text-align: center;
            margin-bottom: 10px;
            font-size: 2.5em;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }

        .subtitle {
            color: rgba(255,255,255,0.9);
            text-align: center;
            margin-bottom: 30px;
            font-size: 1.1em;
        }

        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }

        .card {
            background: white;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            transition: transform 0.3s ease;
        }

        .card:hover {
            transform: translateY(-5px);
        }

        .card-title {
            font-size: 1.2em;
            font-weight: bold;
            margin-bottom: 15px;
            color: #333;
            border-bottom: 3px solid #667eea;
            padding-bottom: 10px;
        }

        .stat-box {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 8px;
            color: white;
            margin-bottom: 10px;
        }

        .stat-label {
            font-size: 0.9em;
            opacity: 0.9;
        }

        .stat-value {
            font-size: 1.8em;
            font-weight: bold;
        }

        .chart {
            margin-top: 15px;
        }

        .bar {
            margin-bottom: 10px;
        }

        .bar-label {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
            font-size: 0.9em;
            color: #666;
        }

        .bar-container {
            background: #f0f0f0;
            border-radius: 8px;
            height: 30px;
            overflow: hidden;
            position: relative;
        }

        .bar-fill {
            height: 100%;
            background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: flex-end;
            padding-right: 10px;
            color: white;
            font-weight: bold;
            font-size: 0.85em;
            transition: width 1s ease;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }

        th {
            background: #667eea;
            color: white;
            padding: 12px;
            text-align: left;
            font-size: 0.9em;
            position: sticky;
            top: 0;
        }

        td {
            padding: 10px 12px;
            border-bottom: 1px solid #eee;
            font-size: 0.85em;
        }

        tr:hover {
            background: #f5f5f5;
        }

        .status-badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.8em;
            font-weight: bold;
        }

        .status-valid {
            background: #4caf50;
            color: white;
        }

        .status-expired {
            background: #f44336;
            color: white;
        }

        .status-unavailable {
            background: #ff9800;
            color: white;
        }

        .source-yahoo { color: #7c3aed; font-weight: bold; }
        .source-finnhub { color: #0891b2; font-weight: bold; }
        .source-fallback { color: #dc2626; font-weight: bold; }

        .full-width {
            grid-column: 1 / -1;
        }

        .table-container {
            max-height: 500px;
            overflow-y: auto;
            border-radius: 8px;
            border: 1px solid #eee;
        }

        @media (max-width: 768px) {
            h1 {
                font-size: 1.8em;
            }

            .grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📊 市值缓存数据可视化</h1>
        <div class="subtitle">生成时间: ${generatedAt}</div>

        <!-- 统计卡片 -->
        <div class="grid">
            <!-- MongoDB 统计 -->
            <div class="card">
                <div class="card-title">🗄️ MongoDB (L2 缓存)</div>
                <div class="stat-box">
                    <div class="stat-label">总缓存数量</div>
                    <div class="stat-value">${totalCount}</div>
                </div>
                <div class="stat-box" style="background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);">
                    <div class="stat-label">有效缓存</div>
                    <div class="stat-value">${validCount}</div>
                </div>
                <div class="stat-box" style="background: linear-gradient(135deg, #f44336 0%, #e53935 100%);">
                    <div class="stat-label">过期缓存</div>
                    <div class="stat-value">${expiredCount}</div>
                </div>
            </div>

            <!-- Redis 统计 -->
            <div class="card">
                <div class="card-title">⚡ Redis (L1 缓存)</div>
                ${
                  available
                    ? `
                <div class="stat-box">
                    <div class="stat-label">缓存数量</div>
                    <div class="stat-value">${redisCount}</div>
                </div>
                <div class="stat-box" style="background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);">
                    <div class="stat-label">缓存命中率</div>
                    <div class="stat-value">${((redisCount / totalCount) * 100).toFixed(1)}%</div>
                </div>
                <div class="stat-box" style="background: linear-gradient(135deg, #2196f3 0%, #1976d2 100%);">
                    <div class="stat-label">预估内存使用</div>
                    <div class="stat-value">${(redisCount * 0.2).toFixed(1)} KB</div>
                </div>
                `
                    : `
                <div class="stat-box" style="background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);">
                    <div class="stat-label">状态</div>
                    <div class="stat-value">不可用</div>
                </div>
                <div style="padding: 15px; background: #fff3cd; border-radius: 8px; margin-top: 10px;">
                    <p style="color: #856404; margin: 0; font-size: 0.9em;">
                        ⚠️ Redis 未连接<br>
                        运行: <code>docker compose up -d redis</code>
                    </p>
                </div>
                `
                }
            </div>

            <!-- 性能指标 -->
            <div class="card">
                <div class="card-title">📈 性能指标</div>
                <div class="stat-box">
                    <div class="stat-label">L1 命中率 (Redis)</div>
                    <div class="stat-value">${((redisCount / totalCount) * 100).toFixed(1)}%</div>
                </div>
                <div class="stat-box" style="background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);">
                    <div class="stat-label">L2 命中率 (MongoDB)</div>
                    <div class="stat-value">${((validCount / totalCount) * 100).toFixed(1)}%</div>
                </div>
                <div class="stat-box" style="background: linear-gradient(135deg, #2196f3 0%, #1976d2 100%);">
                    <div class="stat-label">总命中率</div>
                    <div class="stat-value">${(((redisCount + validCount) / (totalCount * 2)) * 100).toFixed(1)}%</div>
                </div>
            </div>
        </div>

        <!-- 数据源分布 -->
        <div class="card">
            <div class="card-title">📊 数据源分布</div>
            <div class="chart">
                ${sourceChartData
                  .map(
                    (item: any) => `
                <div class="bar">
                    <div class="bar-label">
                        <span><strong>${item.name}</strong></span>
                        <span>${item.count} 条 (${item.percentage}%)</span>
                    </div>
                    <div class="bar-container">
                        <div class="bar-fill" style="width: ${item.percentage}%">
                            ${item.percentage}%
                        </div>
                    </div>
                </div>
                `
                  )
                  .join('')}
            </div>
        </div>

        <!-- MongoDB 缓存记录表 -->
        <div class="card full-width">
            <div class="card-title">📝 MongoDB 缓存记录（最近 100 条）</div>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>状态</th>
                            <th>股票代码</th>
                            <th>市值 (美元)</th>
                            <th>价格</th>
                            <th>数据源</th>
                            <th>最后更新</th>
                            <th>有效期至</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${records
                          .map((record: any) => {
                            const isValid = new Date(record.validUntil) > now;
                            return `
                            <tr>
                                <td>
                                    <span class="status-badge ${isValid ? 'status-valid' : 'status-expired'}">
                                        ${isValid ? '✅ 有效' : '❌ 过期'}
                                    </span>
                                </td>
                                <td><strong>${record.symbol}</strong></td>
                                <td>$${(record.marketCap / 1e9).toFixed(2)}B</td>
                                <td>$${record.price.toFixed(2)}</td>
                                <td class="source-${record.source}">${record.source.toUpperCase()}</td>
                                <td>${new Date(record.lastUpdated).toLocaleString()}</td>
                                <td>${new Date(record.validUntil).toLocaleString()}</td>
                            </tr>
                            `;
                          })
                          .join('')}
                    </tbody>
                </table>
            </div>
        </div>

        ${
          samples.length > 0
            ? `
        <!-- Redis 缓存记录表 -->
        <div class="card full-width">
            <div class="card-title">⚡ Redis 缓存记录（前 50 条）</div>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>股票代码</th>
                            <th>市值 (美元)</th>
                            <th>价格</th>
                            <th>数据源</th>
                            <th>TTL (秒)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${samples
                          .map(
                            (sample: any) => `
                            <tr>
                                <td><strong>${sample.symbol}</strong></td>
                                <td>$${(sample.marketCap / 1e9).toFixed(2)}B</td>
                                <td>$${sample.price.toFixed(2)}</td>
                                <td class="source-${sample.source}">${sample.source.toUpperCase()}</td>
                                <td>${sample.ttl}s</td>
                            </tr>
                        `
                          )
                          .join('')}
                    </tbody>
                </table>
            </div>
        </div>
        `
            : ''
        }
    </div>

    <script>
        // 动画效果
        window.addEventListener('load', () => {
            const bars = document.querySelectorAll('.bar-fill');
            bars.forEach(bar => {
                const width = bar.style.width;
                bar.style.width = '0%';
                setTimeout(() => {
                    bar.style.width = width;
                }, 100);
            });
        });
    </script>
</body>
</html>
`;
}

// 运行可视化
visualizeCache().then(() => process.exit(0));

