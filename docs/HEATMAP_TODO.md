# 🔄 热力图待优化项目清单

**创建日期**：2025-10-25  
**最后更新**：2025-10-25  
**组件**：`components/heatmap/UserHeatmap.tsx`

---

## ✅ 已完成的优化

### 高优先级（关键性能）
- [x] 精准状态更新（对象克隆减少 98%）
- [x] ECharts 实例生命周期优化（消除内存泄漏）
- [x] ECharts 配置优化（lazyUpdate + notMerge）

### 中优先级（健壮性）
- [x] SSE 健壮重连机制（指数退避、超时、心跳）
- [x] SSE 更新节流（requestAnimationFrame 批量处理）
- [x] MongoDB 市值缓存层（减少 90% API 调用）
- [x] Inngest 定时任务（每天自动更新市值）

### 显示优化
- [x] 一级视图显示所有 Pool 的股票（leafDepth: 2）
- [x] 市值数据回退机制（处理无效数据）
- [x] 平滑算法（对数 → 平方根）
- [x] 智能 label 显示策略（根据方块大小）

---

## 🔄 待优化项目（按优先级）

### 🔴 高优先级：显示效果调整

#### 1. **平滑算法微调**
**问题**：当前平方根平滑可能仍需调整平衡点

**可选方案**：
```typescript
// 方案 A：立方根（更温和）
return Math.cbrt(marketCap);

// 方案 B：调整的平方根（可调节系数）
const coefficient = 0.7; // 0.5-1.0 可调
return Math.pow(marketCap, coefficient);

// 方案 C：分段平滑（大股票用平方根，小股票用线性）
if (marketCap > 1000000000000) { // > 1T
  return Math.sqrt(marketCap);
} else {
  return marketCap / 100000; // 线性缩放
}

// 方案 D：对数-线性混合
const alpha = 0.5; // 混合比例
return alpha * Math.log(marketCap) + (1 - alpha) * (marketCap / 1000000000);
```

---

#### 2. **Label 显示优化**
**问题**：当前基于面积的阈值可能不够精确

**改进方向**：
```typescript
// 考虑宽高比，避免细长方块显示过多文字
const width = params.rect?.width || 0;
const height = params.rect?.height || 0;
const aspectRatio = Math.max(width, height) / Math.min(width, height);

if (area > 1500 && aspectRatio < 3) {
  // 只有比较方正的大方块才显示完整信息
  return [symbol, price, change].join('\n');
} else if (width > 40 && height > 25) {
  // 宽高都足够才显示
  return [symbol, change].join('\n');
}
```

---

#### 3. **动态字体大小**
**问题**：固定字体可能不适合所有方块

**改进方向**：
```typescript
// 根据方块大小动态调整字体
const fontSize = Math.max(8, Math.min(14, Math.sqrt(area) / 3));

return {
  symbol: stock.symbol,
  fontSize: fontSize,
  // ...
};
```

---

### 🟡 中优先级：交互体验

#### 4. **添加缩放功能**
**目的**：让用户可以放大查看小股票

**实现**：
```typescript
roam: 'move', // 允许拖动和缩放
scaleLimit: {
  min: 1,
  max: 5,
},
```

---

#### 5. **键盘导航支持**
**目的**：提升无障碍性

**实现**：
- 方向键切换选中的股票
- Enter 键进入详情
- Escape 键返回上层

---

#### 6. **自定义配置面板**
**功能**：
- 选择平滑算法（线性/平方根/对数）
- 调整 label 显示详细程度
- 切换颜色主题

---

### 🔵 低优先级：代码质量

#### 7. **组件拆分**
当前 650+ 行单文件，建议拆分为：
- `hooks/useHeatmapData.ts` - 数据获取 + SSE
- `hooks/useHeatmapChart.ts` - ECharts 管理
- `utils/heatmap-config.ts` - 配置和常量
- `utils/heatmap-smoothing.ts` - 平滑算法
- 子组件（Toolbar、Legend 等）

---

#### 8. **类型安全增强**
```typescript
import type { ECElementEvent } from 'echarts/types/dist/echarts';

// 替换所有 any
chart.on('click', function (params: ECElementEvent) { ... });
```

---

#### 9. **单元测试**
```typescript
// __tests__/heatmap.test.tsx
describe('smoothValue', () => {
  it('should handle zero marketCap', () => {
    expect(smoothValue(0)).toBe(1);
  });
  
  it('should compress extreme values', () => {
    const large = 3000000000000; // 3T
    const small = 100000000000;  // 100B
    const ratio = smoothValue(large) / smoothValue(small);
    expect(ratio).toBeGreaterThan(3);
    expect(ratio).toBeLessThan(10);
  });
});
```

---

## 💡 已知问题和解决思路

### Issue 1: 股票详细信息显示不全
**状态**：🟡 待优化  
**原因**：平滑算法和 label 策略需要进一步平衡  
**建议方案**：
1. 添加用户自定义配置（选择平滑强度）
2. 实现动态字体大小
3. 考虑宽高比，避免细长方块显示过多文字

---

### Issue 2: Finnhub 市值数据不完整
**状态**：✅ 已缓解（回退机制）  
**长期方案**：
1. 升级到 Finnhub 付费账号
2. 切换到 IEX Cloud 或 Alpha Vantage
3. 实现多数据源回退策略

---

### Issue 3: 实时更新可能触发无限循环
**状态**：⚠️ 潜在风险（未观察到）  
**监控**：如果 SSE 连接后 CPU 持续高使用率，检查是否有：
- SSE 消息触发状态更新
- 状态更新触发 useEffect
- useEffect 触发 SSE 重连
- 形成循环

**解决**：添加依赖追踪和防抖

---

## 📝 后续建议

### 短期（1-2 天）
1. 继续调试 label 显示策略
2. 添加用户配置面板（选择平滑算法）
3. 性能和稳定性测试

### 中期（1-2 周）
1. 组件拆分和代码重构
2. 添加单元测试
3. 优化移动端体验

### 长期（1 个月+）
1. 切换到更好的数据源
2. 添加更多图表类型（树状图、气泡图）
3. 实现自定义配置和主题

---

## 🎓 参考资料

### 平滑算法文献
- [Finviz Heatmap](https://finviz.com/map.ashx) - 参考实现
- [TradingView Heatmap](https://www.tradingview.com/heatmap/stock/) - 视觉设计
- [D3 Treemap](https://d3-wiki.readthedocs.io/zh-cn/master/Treemap-Layout/) - 算法原理

### ECharts 文档
- [Treemap Configuration](https://echarts.apache.org/en/option.html#series-treemap)
- [Label Formatter](https://echarts.apache.org/en/option.html#series-treemap.label.formatter)
- [Performance Optimization](https://echarts.apache.org/handbook/en/best-practices/canvas-vs-svg/)

---

**下次继续时，从 Issue 1 开始优化。**

