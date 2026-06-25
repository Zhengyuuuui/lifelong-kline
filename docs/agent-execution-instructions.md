# Agent 执行指令

## 总原则

你正在维护一个要求 iOS 前端 1:1 还原的 AI 商用应用。除非任务明确要求 UI 修改，否则不要改变任何可见视觉、布局、动画、文案和交互节奏。

## 必须遵守

- 不重写前端为 React Native。
- 不把 `GEMINI_API_KEY` 或支付密钥注入前端。
- 不信任前端传入的会员状态、金额、userId。
- 不直接删除用户数据，账号删除使用软删除。
- 不提交 `data/`、`tmp/`、`backups/`、`dist/`、`node_modules/`。
- 修改后至少跑 `npm run lint`。
- 触及后端 API 后跑 `npm run test:api`。
- 触及 iOS/前端构建后跑 `npm run ios:sync`。

## 当前架构

- 前端：React/Vite。
- iOS：Capacitor WebView，复用同一份 `dist`。
- 后端：Express。
- 数据库：本地预览使用 SQLite；生产 API 使用 Postgres。
- AI：旧前端兼容 `/api/gemini/*`，生产 JWT 接口使用 `/api/ai/generate`。
- 支付：本地可 mock；生产 Apple IAP 服务端收据校验使用 `/api/payment/verify-receipt`。

## 执行阶段

### 阶段 A：Apple IAP

目标：完成 iOS 正式内购。

任务：

1. 选择 StoreKit/Capacitor IAP 方案。
2. 前端支付成功后拿 transaction/receipt。
3. 调用服务端 `/api/payment/verify-receipt`。
4. 使用 Apple `transaction_id` 保障订单幂等。
5. 增加恢复购买入口。
6. 更新 `payment-subscription-design.md`。

验收：

```bash
npm run lint
npm run test:api
npm run ios:sync
```

### 阶段 B：生产支付 Webhook

目标：支持退款、过期、续费、撤销。

任务：

1. 新增 `/api/webhooks/apple`。
2. 验证签名。
3. 根据 notification type 更新 `orders` 和 `memberships`。
4. 对 transaction id 做幂等。
5. 增加 webhook smoke test。

验收：

```bash
npm run lint
npm run test:api
```

### 阶段 C：Postgres 迁移

目标：让数据库支持生产增长。

任务：

1. 维护 `db/migrations` SQL。
2. 执行 `npm run db:postgres:migrate`。
3. 检查 `/api/postgres/health`。
4. 更新 `database-schema.md`。

验收：

```bash
npm run lint
npm run test:api
npm run db:postgres:migrate
```

### 阶段 D：视觉回归

目标：守住前端 1:1。

任务：

1. 建立 Playwright 截图基线。
2. 覆盖桌面、iPhone、iPad。
3. 覆盖首页、登录、支付、用户中心、顺风窗、人脸估值。
4. 不因测试便利修改 UI。

验收：

```bash
npm run lint
npm run build:web
```

### 阶段 E：上线部署

目标：完成生产环境可运行版本。

任务：

1. 配置生产环境变量。
2. 配置 HTTPS 域名。
3. 配置备份任务。
4. 配置错误监控。
5. 执行上线清单。

验收：

```bash
npm run preflight:prod
npm run verify:full
```

## 修改后报告格式

每次完成后说明：

- 改了哪些文件。
- 增加了哪些能力。
- 哪些命令已通过。
- 哪些仍需真实商户/Apple 账号/生产密钥才能完成。

## 关键文档

- `docs/execution-runbook.md`
- `docs/complete-commercial-design.md`
- `docs/payment-subscription-design.md`
- `docs/privacy-security-design.md`
- `docs/launch-readiness-checklist.md`
