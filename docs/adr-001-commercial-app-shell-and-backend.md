# ADR 001: 商用 iOS 外壳与后端落地路径

## 状态

Accepted

## 背景

产品要求 iOS 端前端 1:1 还原，且设计交互不能有肉眼可见变动。原始包已经是完整 React/Vite 高保真前端，含三维、图表、AI、支付弹窗和多个子模块。若重写为 React Native，会产生较高 UI 差异风险。

## 决策

1. iOS 端采用 Capacitor WebView 承载同一套 Vite 构建产物。
2. 后端采用 Express 单体服务承载 API、Gemini 代理、静态资源和数据库访问。
3. 本地与首版部署使用 SQLite，表结构保持可迁移到 Postgres 的关系模型。
4. 认证使用服务端会话：Web 用 HttpOnly Cookie，iOS/远程客户端可用 bearer token。
5. 支付先以订单/会员/权益抽象落库，真实 Apple IAP、微信、支付宝验签通过 `PAYMENTS_MODE=live` 接入。

## 理由

- 最大化前端还原：同一份 DOM/CSS/动画在 Web 和 iOS 复用。
- 降低上线前不确定性：服务端单体更容易观测、部署和调试。
- 数据模型不过度绑定 SQLite：用户、身份、会话、资料、订单、会员、设置、AI 日志、审计事件均是标准关系表。
- 安全边界清晰：Gemini Key、会员状态、支付结果和会话 token 校验都在服务端。

## 后果

- 首版可快速进入 TestFlight，但 App Store 前仍要补真实 IAP 商品、签名证书、隐私政策和生产域名。
- WebView 模式需要持续关注 iOS Safari/WebKit 兼容性，尤其是摄像头、人脸估值模块和大体积 JS 首屏性能。
- 当并发和数据规模增长后，应将 SQLite 迁移到托管 Postgres，并加入 Redis/队列处理 AI 缓存和异步任务。
