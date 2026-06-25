# 生产部署设计

## 1. 推荐首版部署

### 推荐上线方案

- Frontend + API：同一个 Node 服务，Express 负责 API 和生产静态资源。
- Database：PostgreSQL。
- Static assets：首版由 Node 服务托管，增长后迁移到 CDN。
- HTTPS：平台托管证书。
- 部署平台：Render、Fly.io、Railway、VPS、Docker 均可。

优点：部署路径短，同时具备订单、会员、AI 历史的可靠审计能力。  
增长后可拆分 CDN、API 多实例、Redis 限流、AI Jobs 队列和可观测系统。

## 2. 环境变量

生产必须设置：

```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=postgres://user:password@host:5432/life_kline
DATABASE_SSL=true
JWT_ACCESS_SECRET=至少32位随机字符串
JWT_REFRESH_SECRET=另一组至少32位随机字符串
APPLE_CLIENT_ID=com.lifekline.destiny
APPLE_BUNDLE_ID=com.lifekline.destiny
APPLE_IAP_PRODUCT_IDS=com.lifekline.monthly,com.lifekline.yearly,com.lifekline.lifetime
APPLE_APP_APPLE_ID=1234567890
APPLE_ROOT_CERTIFICATE_PATHS=/secure/certs/AppleRootCA-G3.cer,/secure/certs/AppleRootCA-G4.cer
APPLE_SIGNED_DATA_ONLINE_CHECKS=true
APPLE_SHARED_SECRET=...
GEMINI_API_KEY=...
CLIENT_ORIGINS=https://app.your-domain.com,capacitor://localhost
CLIENT_CONNECT_SRC=https://api.your-domain.com
PAYMENTS_MODE=live
PG_RATE_LIMIT_ENABLED=true
ENABLE_LEGACY_COMPAT_API=false
ENABLE_LEGACY_AI_PROXY=false
VITE_ALLOW_LOCAL_PREMIUM_FALLBACK=false
AI_FREE_DAILY_LIMIT=20
AI_MEMBER_DAILY_LIMIT=500
AI_REQUEST_WINDOW_MS=86400000
```

iOS 构建时：

```bash
VITE_API_BASE_URL=https://api.your-domain.com \
VITE_ENABLE_LEGACY_AI_PROXY=false \
VITE_ALLOW_LOCAL_PREMIUM_FALLBACK=false \
VITE_APPLE_IAP_MONTHLY_PRODUCT_ID=com.lifekline.monthly \
VITE_APPLE_IAP_LIFETIME_PRODUCT_ID=com.lifekline.lifetime \
npm run ios:sync
```

## 3. 启动命令

```bash
npm ci
npm run build
npm run db:postgres:migrate
npm run start
```

健康检查：

```bash
curl https://api.your-domain.com/api/health
curl https://api.your-domain.com/api/postgres/health
```

Apple webhook：

```text
https://api.your-domain.com/api/webhooks/apple
```

在 App Store Connect 的 App Store Server Notifications V2 配置中填写该 URL。

生产环境默认关闭本地预览兼容入口：

- `ENABLE_LEGACY_COMPAT_API=false`：关闭 SQLite/passwordless/mock checkout 等兼容 API。
- `ENABLE_LEGACY_AI_PROXY=false`：关闭旧 `/api/gemini/*` 原始代理，前端生产构建会走 `/api/ai/generate`。
- `VITE_ALLOW_LOCAL_PREMIUM_FALLBACK=false`：关闭本地会员兜底，生产包只按服务端 active membership 解锁。

## 4. 数据备份

Postgres 建议：

- 使用云数据库自动快照。
- 每日自动备份。
- 保留最近 7 天每日备份。
- 保留最近 4 周周备份。
- 备份文件上传到对象存储。
- 支付相关表保留长期审计数据，不随 AI 日志清理一起删除。

## 5. 数据库维护

```bash
npm run db:postgres:migrate
```

维护节奏：

- `db:postgres:migrate`：每次发布前。
- 云数据库备份：每天。
- AI 历史清理：按隐私策略单独执行。

## 6. 监控指标

必须观察：

- `/api/health` 可用性。
- API p95 latency。
- Gemini 5xx/429 比例。
- AI 每日调用量。
- 订单创建数、支付成功数。
- 登录成功数。
- Postgres 连接池使用率。
- Postgres 慢查询和表膨胀。

## 7. 回滚策略

### 代码回滚

1. 保留上一版构建产物。
2. 新版本发布后观察 30 分钟。
3. 若错误率明显上升，回滚到上一版。

### 数据回滚

1. 支付/会员相关错误优先手工修正，不直接全库回滚。
2. 若 schema 破坏，停止服务。
3. 从最近 Postgres 快照恢复。
4. 对恢复期间订单进行对账。

## 8. 数据库迁移

首次上线或 schema 更新前执行：

```bash
npm run db:postgres:migrate
```

迁移文件位于 `db/migrations`，已执行记录写入 `schema_migrations`。

## 9. 生产风险

| 风险 | 缓解 |
| --- | --- |
| AI 成本被刷 | 额度、限流、会员闸门 |
| 支付回调重复 | transaction id 幂等 |
| 数据库迁移失败 | 发布前执行 `db:postgres:migrate`，失败即中止部署 |
| App Store 拒审 | IAP、隐私政策、免责声明、恢复购买 |
| JS 体积过大 | 后续分包、CDN、缓存 |
| 命理内容争议 | 娱乐/反思免责声明 |
