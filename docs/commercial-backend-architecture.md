# 商用后端架构说明

## 当前实现

本项目已经从纯前端模拟升级为 Express 全栈应用，并同时保留两套后端能力：

- 本地预览兼容层：SQLite + passwordless session，用于当前 Web/iOS 模拟器快速联调；生产默认由 `ENABLE_LEGACY_COMPAT_API=false` 关闭。
- 生产商用层：PostgreSQL + JWT + Apple/微信登录 + 安全 AI 路由 + Apple IAP 收据校验。

前端视觉、布局、动画和交互组件保持原样；生产能力通过新增 API 和 `services/backendClient.ts` 桥接，不改变用户可见界面。

## 核心能力

- 用户与身份：生产层 `users`、`user_auth_identities` 支持 Sign in with Apple 与微信 OAuth。
- 会话安全：生产层签发短期 `accessToken` 与可轮换 `refreshToken`；刷新 token 只保存 hash。
- 用户资料：`user_profiles` 持久化姓名、性别、出生日期、出生时间、出生地与派生 AI 基础数据。
- AI 生成：`POST /api/ai/generate` 需要 JWT，服务端读取用户资料、构建提示词、调用模型并写入 `ai_history`；生产默认由 `ENABLE_LEGACY_AI_PROXY=false` 关闭旧 `/api/gemini/*`。
- AI 用量控制：免费用户和会员用户使用不同日额度；未配置服务端 Key 时快速返回 `503`。
- 会员与订单：`POST /api/payment/verify-receipt` 优先校验 StoreKit 2 signed transaction JWS，兼容 Apple receipt，写入 `orders`，并按 `transaction_id` 幂等更新 `memberships`。
- Apple 订阅通知：`POST /api/webhooks/apple` 验签 App Store Server Notifications V2，处理续费、退款、过期、撤销等事件。
- 跨实例限流：`api_rate_limits` 使用 Postgres 原子 upsert，为 Apple/微信登录、AI、支付验签、webhook 提供多实例下的基础限流。
- 健康检查：`GET /api/health` 检查本地兼容服务，`GET /api/postgres/health` 检查生产 Postgres 服务和关键表。
- 安全防护：CORS 白名单、安全响应头、参数化 SQL、输入校验、服务端密钥隔离、错误信息生产环境脱敏。
- 审计：`audit_events` 记录登录、资料更新、支付验签等关键事件。

## 生产 API

- `POST /api/auth/apple`：Apple identity token 验证并签发 JWT。
- `POST /api/auth/wechat`：微信授权码换 openid/unionid 并签发 JWT。
- `POST /api/auth/refresh`：刷新并轮换 refresh token。
- `POST /api/auth/logout`：撤销 refresh token。
- `GET /api/user/me`：获取生产用户、资料和会员状态。
- `POST /api/user/profile`：保存生产用户资料。
- `POST /api/ai/generate`：安全 AI 生成。
- `POST /api/payment/verify-receipt`：Apple IAP 收据校验。
- `POST /api/webhooks/apple`：Apple 订阅通知 webhook。
- `GET /api/postgres/health`：生产数据库健康检查。

## 本地兼容 API

- `GET /api/session`
- `POST /api/auth/passwordless`
- `POST /api/profile`
- `POST /api/membership/checkout`
- `POST /api/gemini/generateContent`
- `POST /api/gemini/generateContentStream`

这些接口用于当前前端模拟器和本地预览，不作为最终 iOS 原生登录/支付的生产入口。

## 环境变量

- `DATABASE_URL`：生产 Postgres 连接串。
- `DATABASE_SSL`：生产数据库是否开启 SSL。
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`：至少 32 位随机值。
- `APPLE_CLIENT_ID` / `APPLE_BUNDLE_ID`：Apple 登录受众与 iOS Bundle ID。
- `WECHAT_APP_ID` / `WECHAT_APP_SECRET`：微信 OAuth 配置。
- `GEMINI_API_KEY` 或 `API_KEY`：服务端 AI Key。
- `AI_MODEL` / `AI_FALLBACK_MODELS`：AI 模型和降级模型。
- `AI_FREE_DAILY_LIMIT` / `AI_MEMBER_DAILY_LIMIT`：AI 日额度。
- `PAYMENTS_MODE`：`mock` 或 `live`。生产必须是 `live`。
- `APPLE_IAP_ENV`：`sandbox` 或 `production`。
- `APPLE_SHARED_SECRET`：Apple IAP 共享密钥。
- `APPLE_IAP_PRODUCT_IDS`：允许验签入账的商品 ID 白名单。
- `APPLE_APP_APPLE_ID`：生产 App Apple ID，用于 App Store 通知验签。
- `APPLE_ROOT_CERTIFICATE_PATHS` 或 `APPLE_ROOT_CERTIFICATES_PEM`：Apple 根证书，用于 `signedPayload` 验签。
- `PG_RATE_LIMIT_ENABLED`：是否启用 Postgres 跨实例限流。
- `CLIENT_ORIGINS`：生产 CORS 白名单。
- `VITE_API_BASE_URL`：iOS/远程前端访问线上 API 的基础地址。

## 运维命令

- `npm run db:postgres:migrate`：执行 Postgres schema 迁移。
- `npm run test:api`：验证本地兼容 API。
- `npm run preflight`：本地发布前检查。
- `npm run preflight:prod`：生产环境变量与关键文件检查。
- `npm run build`：Web + Node 生产构建。
- `npm audit --audit-level=high`：高危依赖扫描。

## 上线顺序

1. 配置生产环境变量。
2. 执行 `npm ci`。
3. 执行 `npm run db:postgres:migrate`。
4. 执行 `npm run preflight:prod`。
5. 执行 `npm run build`。
6. 启动 `npm run start`。
7. 检查 `/api/health` 和 `/api/postgres/health`。
8. iOS 使用 `VITE_API_BASE_URL=https://api.your-domain.com npm run ios:sync` 同步线上 API 地址。

## 仍需部署时配置

代码已准备完成，但真实上线前必须在部署环境填入：

- AI Key：`GEMINI_API_KEY` 或 `API_KEY`。
- 数据库连接：`DATABASE_URL`。
- JWT 密钥：`JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`。
- Apple IAP：`APPLE_SHARED_SECRET` 和真实 `APPLE_IAP_PRODUCT_IDS`。
- 生产域名：`CLIENT_ORIGINS` / `VITE_API_BASE_URL`。
