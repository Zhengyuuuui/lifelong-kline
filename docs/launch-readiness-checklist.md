# 上线准备清单

## P0：必须完成

### iOS

- [ ] Apple Developer Team 已配置。
- [ ] Bundle ID 使用 `com.lifekline.destiny` 或正式品牌 ID。
- [ ] App Icon 完成。
- [ ] Launch Screen 完成。
- [ ] `NSCameraUsageDescription` 文案通过审核。
- [ ] 真机测试摄像头模块。
- [ ] 真机测试登录、支付、会员恢复。
- [x] iOS 原生 Apple 登录桥接完成。
- [ ] WeChat OpenSDK、Universal Link、URL Scheme 已接入并通过真机授权测试。
- [ ] TestFlight 内测至少 3 人完成。

### 支付

- [ ] App Store Connect 创建 IAP 商品。
- [x] StoreKit 前端/原生桥接完成。
- [x] 服务端 Apple receipt 验证接口完成：`POST /api/payment/verify-receipt`。
- [x] 服务端 StoreKit 2 signed transaction JWS 验签完成。
- [x] App Store Server Notifications V2 webhook 完成：`POST /api/webhooks/apple`。
- [ ] `PAYMENTS_MODE=live`。
- [x] 恢复购买入口完成。
- [x] 退款/过期 webhook 服务端处理完成。
- [x] 订单按 Apple `transaction_id` 幂等落库。

### 后端

- [ ] 生产 HTTPS 域名。
- [ ] `NODE_ENV=production`。
- [ ] `DATABASE_URL` 指向生产 Postgres。
- [ ] `npm run db:postgres:migrate` 已执行。
- [ ] `/api/postgres/health` 正常。
- [x] 用户设置/绑定/分享计数/注销接口已接入 Postgres。
- [ ] `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` 已设置为 32 位以上随机值。
- [ ] `APPLE_ROOT_CERTIFICATE_PATHS` 或 `APPLE_ROOT_CERTIFICATES_PEM` 已配置。
- [ ] App Store Connect 已填写 `/api/webhooks/apple` 通知地址。
- [ ] `PG_RATE_LIMIT_ENABLED=true`。
- [ ] `ENABLE_LEGACY_COMPAT_API=false`。
- [ ] `ENABLE_LEGACY_AI_PROXY=false`。
- [ ] `npm run preflight` 显示 `frontend:no-direct-legacy-gemini-api` 通过。
- [ ] `VITE_ALLOW_LOCAL_PREMIUM_FALLBACK=false`。
- [ ] `GEMINI_API_KEY` 设置。
- [ ] `CLIENT_ORIGINS` 精确配置。
- [ ] `CLIENT_CONNECT_SRC` 精确配置。
- [ ] 健康检查接入部署平台。
- [ ] `npm run test:api` 通过。
- [ ] `npm audit --audit-level=high` 通过。
- [ ] 备份计划已配置。

### 法务与合规

- [ ] 隐私政策 URL。
- [ ] 用户协议 URL。
- [ ] AI/命理免责声明。
- [ ] App Store Privacy 表单。
- [ ] 付费条款。
- [ ] 删除账号入口说明。

## P1：上线后两周

- [ ] 错误监控接入。
- [ ] API 日志结构化。
- [ ] 订单对账脚本。
- [ ] 会员恢复购买自动化测试。
- [ ] AI response cache。
- [ ] 用户数据导出接口。
- [ ] 运营后台最小版。

## P2：增长阶段

- [ ] Redis 限流。
- [ ] 队列处理 AI 长任务。
- [ ] 多实例 API。
- [ ] CDN 静态资源。
- [ ] A/B 测试。
- [ ] 增长漏斗分析。
- [ ] 多语言隐私与条款。

## 每次发布前

```bash
npm run lint
npm run test:api
npm run build
npm run db:postgres:migrate
npm run ios:sync
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO build
npm audit --audit-level=high
```

## 发布后观察

- [ ] `/api/health` 正常。
- [ ] `/api/postgres/health` 正常。
- [ ] 登录成功率正常。
- [ ] AI 503/429 比例正常。
- [ ] 订单支付成功率正常。
- [ ] iOS 崩溃率正常。
- [ ] 用户反馈无重大 UI 还原问题。
