# 🧪 UserHeatmap 组件测试计划

**测试日期**：2025-10-25  
**组件**：`components/heatmap/UserHeatmap.tsx`  
**优化内容**：性能优化 + SSE 健壮性 + 更新节流

---

## 📋 测试前准备

### 1. 启动开发环境
```bash
# 启动 Next.js 开发服务器
npm run dev

# 在另一个终端启动 Inngest（如果需要）
npx inngest-cli@latest dev
```

### 2. 准备测试账号
- 确保有至少 1 个观察列表分组
- 每个分组至少有 5-10 个股票
- 建议准备 2-3 个分组，每个 10-20 个股票

### 3. 打开浏览器开发者工具
```
Chrome DevTools 快捷键：
- Mac: Cmd + Option + I
- Windows/Linux: Ctrl + Shift + I
```

**需要打开的面板**：
- Console（控制台）- 查看日志
- Network（网络）- 监控 SSE 连接
- Performance（性能）- 性能分析
- Memory（内存）- 内存泄漏检测

---

## ✅ 功能测试

### Test 1: 基础数据加载
**预期行为**：
- ✅ 页面加载后显示 "加载数据中..." 状态
- ✅ 3-5 秒内显示热力图
- ✅ 一级视图显示所有 Pool 分组
- ✅ 每个 Pool 显示统计信息（股票数、平均涨跌幅、市值）
- ✅ SSE 连接状态显示为 "实时连接"（绿色图标）

**验证步骤**：
1. 访问 `/heatmap` 页面
2. 观察加载过程
3. 检查控制台日志是否有错误
4. 验证 Pool 数量和股票数量正确

**控制台日志示例**：
```
[Heatmap Debug] 获取到的 pools 数量: 3
[Heatmap Debug] Pools 详情: [...]
[SSE] Connecting... (attempt 1/6)
[SSE] Connected successfully
[SSE] Connection confirmed: client-xxx
```

---

### Test 2: 一级 → 二级视图切换
**预期行为**：
- ✅ 点击任意 Pool 进入二级视图
- ✅ 切换流畅，无卡顿（< 100ms）
- ✅ 二级视图显示该 Pool 的所有股票
- ✅ 显示 "返回" 按钮
- ✅ 控制台无错误

**验证步骤**：
1. 点击任意 Pool（如 "Tech Pool"）
2. 验证只显示该 Pool 的股票
3. 点击 "返回" 按钮
4. 验证返回一级视图
5. 重复切换 5-10 次

**性能检查**：
- 切换动画流畅（60fps）
- 无明显延迟
- 无内存持续增长

---

### Test 3: 实时数据更新
**预期行为**：
- ✅ SSE 连接成功后接收实时更新
- ✅ 股票颜色根据涨跌幅实时变化
- ✅ 价格、涨跌幅数据实时更新
- ✅ Pool 统计（平均涨跌幅、市值）实时更新
- ✅ 更新流畅，无卡顿

**验证步骤**：
1. 等待 SSE 连接成功
2. 观察热力图颜色变化
3. Hover 股票查看 Tooltip，验证数据更新
4. 观察控制台日志

**控制台日志示例**：
```
[SSE] Heartbeat received
[Update] Processing 5 stock updates
[Update] Processing 12 stock updates
```

---

### Test 4: Tooltip 交互
**预期行为**：
- ✅ Hover Pool 显示 Pool 信息（股票数、平均涨跌幅、总市值）
- ✅ Hover 股票显示股票详情（价格、涨跌幅、成交量、市值）
- ✅ Tooltip 内容完整、格式正确
- ✅ Tooltip 跟随鼠标，无闪烁

**验证步骤**：
1. 在一级视图 Hover 多个 Pool
2. 在二级视图 Hover 多个股票
3. 验证数据准确性
4. 验证样式美观度

---

### Test 5: 响应式布局
**预期行为**：
- ✅ 窗口 resize 时热力图自动调整
- ✅ 小窗口时仍可正常显示
- ✅ 无布局错位或溢出

**验证步骤**：
1. 调整浏览器窗口大小
2. 缩小到 1024px、768px、375px
3. 验证各尺寸下的显示效果

---

## 🚀 性能测试

### Test 6: SSE 高频更新性能
**测试目的**：验证节流机制是否有效

**验证步骤**：
1. 打开 Chrome DevTools → Performance
2. 点击 "Record" 开始录制
3. 等待 10-15 秒（让 SSE 接收多次更新）
4. 点击 "Stop" 停止录制

**性能指标**：
- ✅ **FPS 稳定在 55-60**
- ✅ **JavaScript 执行时间 < 5ms/次**
- ✅ **Rendering 时间 < 10ms/次**
- ✅ **CPU 使用率 < 50%**（相对空闲状态）

**查看批量更新日志**：
```javascript
// 控制台应该看到批量处理日志
[Update] Processing 3 stock updates  // 每帧最多一次
[Update] Processing 7 stock updates
[Update] Processing 2 stock updates
```

**对比优化前**：
- 优化前：每次更新独立处理（可能 100+ updates/s）
- 优化后：批量处理（最多 60 updates/s，即 60fps）

---

### Test 7: 视图切换性能（内存泄漏检测）
**测试目的**：验证 ECharts 实例不再频繁重建

**验证步骤**：
1. 打开 Chrome DevTools → Memory
2. 点击 "Take snapshot" 获取初始快照
3. 执行 50 次视图切换（一级 ↔ 二级）
4. 点击垃圾桶图标强制 GC
5. 再次 "Take snapshot" 获取最终快照

**内存指标**：
- ✅ **内存增长 < 5 MB**（允许少量增长）
- ✅ **Canvas 数量 = 1**（不应累积）
- ✅ **EventSource 数量 = 1**（不应累积）

**如何检查 Canvas 数量**：
```javascript
// 在控制台执行
document.querySelectorAll('canvas').length  // 应该始终为 1
```

**对比优化前**：
- 优化前：每次切换 dispose + init，可能累积内存
- 优化后：只 init 一次，通过 setOption 更新

---

### Test 8: SSE 重连机制
**测试目的**：验证网络断开时的重连逻辑

**验证步骤**：
1. 正常连接后，观察 "实时连接" 状态
2. 打开 Chrome DevTools → Network → Throttling
3. 选择 "Offline" 模拟断网
4. 观察连接状态变为 "离线"（灰色图标）
5. 等待 2-3 秒后恢复 "Online"
6. 观察重连过程

**预期日志**：
```
[SSE] Connection error
[SSE] Reconnecting in 1000ms (attempt 1/5)
[SSE] Connecting... (attempt 2/6)
[SSE] Connected successfully
```

**重连时间序列**：
- 第 1 次：1 秒
- 第 2 次：2 秒
- 第 3 次：4 秒
- 第 4 次：8 秒
- 第 5 次：16 秒
- 第 6 次：30 秒（最大值）

---

### Test 9: SSE 心跳超时检测
**测试目的**：验证僵尸连接检测

**验证步骤**：
1. 正常连接后，观察控制台
2. 如果后端支持心跳，应每 10 秒看到：
   ```
   [SSE] Heartbeat received
   ```
3. 如果 30 秒无消息，应看到：
   ```
   [SSE] Connection timeout (no message for 30s), reconnecting...
   ```

**注意**：此测试依赖后端是否发送心跳消息。如果后端未实现，前端仍会检测但可能触发误报。

---

## 🔍 错误处理测试

### Test 10: 无观察列表场景
**验证步骤**：
1. 使用没有观察列表的账号登录
2. 访问 `/heatmap` 页面

**预期行为**：
- ✅ 显示错误提示："您还没有添加任何观察列表。请先添加股票到观察列表。"
- ✅ 无控制台错误
- ✅ 不尝试连接 SSE

---

### Test 11: API 错误处理
**验证步骤**：
1. 断开网络或停止后端服务
2. 刷新页面

**预期行为**：
- ✅ 显示错误提示："数据加载失败"
- ✅ 显示 "重试" 按钮
- ✅ 点击 "重试" 重新加载数据
- ✅ 无 JavaScript 崩溃

---

## 📊 测试结果记录

### 功能测试结果
```
[ ] Test 1: 基础数据加载
[ ] Test 2: 一级 → 二级视图切换
[ ] Test 3: 实时数据更新
[ ] Test 4: Tooltip 交互
[ ] Test 5: 响应式布局
```

### 性能测试结果
```
[ ] Test 6: SSE 高频更新性能
    - FPS: _____ (目标: 55-60)
    - JS 执行时间: _____ ms (目标: < 5ms)
    - CPU 使用率: _____ % (目标: < 50%)

[ ] Test 7: 视图切换性能
    - 初始内存: _____ MB
    - 50 次切换后: _____ MB
    - 内存增长: _____ MB (目标: < 5MB)
    - Canvas 数量: _____ (目标: 1)

[ ] Test 8: SSE 重连机制
    - 重连成功: [ ] 是 [ ] 否
    - 重连时间符合指数退避: [ ] 是 [ ] 否

[ ] Test 9: SSE 心跳超时检测
    - 心跳正常: [ ] 是 [ ] 否 [ ] 后端未实现

[ ] Test 10: 无观察列表场景
[ ] Test 11: API 错误处理
```

---

## 🐛 已知问题记录

### 发现的 Bug
```
1. [严重/一般/轻微] 描述：
   - 复现步骤：
   - 预期行为：
   - 实际行为：
   - 截图/日志：

2. ...
```

### 性能瓶颈
```
1. 场景：
   - 指标：
   - 原因分析：
   - 建议修复：

2. ...
```

---

## 📝 测试总结模板

```markdown
## 测试总结

**测试日期**：2025-10-25  
**测试人员**：[姓名]  
**测试环境**：
- 浏览器：Chrome [版本]
- 操作系统：[macOS/Windows/Linux]
- 网络环境：[良好/一般/较差]

### 通过的测试
- [x] Test 1: 基础数据加载
- [x] Test 2: 一级 → 二级视图切换
- ...

### 失败的测试
- [ ] Test X: XXX
  - 失败原因：...
  - 错误日志：...

### 性能数据
- FPS 平均值：58
- 内存增长：2.3 MB
- CPU 使用率：35%

### 整体评价
优化效果显著/一般/需要改进：
- 优点：...
- 缺点：...
- 建议：...

### 下一步行动
1. 修复 Bug X
2. 优化 Y 场景
3. 添加 Z 功能
```

---

## 🎯 成功标准

### 必须通过（P0）
- ✅ 所有功能测试通过（Test 1-5）
- ✅ FPS ≥ 55
- ✅ 内存增长 < 10 MB
- ✅ 无 JavaScript 崩溃

### 期望通过（P1）
- ✅ SSE 重连成功率 > 95%
- ✅ CPU 使用率 < 50%
- ✅ 视图切换 < 100ms

### 可选通过（P2）
- ✅ 心跳检测正常（依赖后端）
- ✅ 所有浏览器兼容（Chrome/Firefox/Safari）

---

**测试完成后请更新 `HEATMAP_OPTIMIZATION.md` 文档，记录实际测试结果。**

