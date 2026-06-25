# 隐私、安全与合规设计

## 1. 数据分类

| 数据 | 示例 | 敏感级别 | 存储位置 |
| --- | --- | --- | --- |
| 账号标识 | user id、provider subject | 中 | 数据库 |
| 联系方式 | email、phone | 高 | 数据库 |
| 命盘资料 | 姓名、性别、生日、时间、地点 | 高 | 数据库、本地缓存 |
| 会员订单 | 金额、provider order id | 高 | 数据库 |
| AI 请求 | prompt hash、模型、状态、耗时 | 中 | 数据库 |
| 审计事件 | 登录、支付、资料变更、注销 | 中 | 数据库 |
| 图片/人脸 | base64 image | 高 | 当前仅请求期使用 |

## 2. 数据最小化

- AI 日志只保存 `prompt_hash`，不保存完整 prompt。
- 人脸估值图片不落库。
- 会话 token 只保存 hash。
- 审计 metadata 只记录业务必要字段。
- 用户注销后不再通过普通查询返回用户资料。

## 3. 用户权利

上线版应提供：

- 删除账号：当前已有 `DELETE /api/account`。
- 撤销会话：当前已有 `POST /api/auth/logout`。
- 导出个人数据：建议新增 `GET /api/account/export`。
- 隐私政策入口：iOS App 内和 App Store 页面都需要。
- 用户协议入口：支付前和设置页需要。

## 4. 安全控制

### 认证

- Web 使用 HttpOnly Cookie。
- iOS/远程客户端使用 bearer token。
- 服务端保存 token hash。
- 会话默认 30 天过期。

### 授权

- 用户资料、设置、订单、会员都按 `req.auth.userId` 绑定。
- 不允许前端传 userId 操作其他用户。
- 删除账号撤销所有 sessions。

### 输入校验

已覆盖：

- 登录 provider、email、phone、clientInstallationId。
- 用户 profile。
- checkout plan/provider/amount。
- confirm orderId/receipt。
- settings/bindings/shareCount。

### 安全头

已覆盖：

- `Content-Security-Policy`
- `X-Content-Type-Options`
- `X-Frame-Options`
- `Referrer-Policy`
- `Permissions-Policy`
- 生产环境 `Strict-Transport-Security`

## 5. AI 安全

### 成本控制

- 匿名用户：`AI_ANON_DAILY_LIMIT`
- 登录免费用户：`AI_FREE_DAILY_LIMIT`
- 会员用户：`AI_MEMBER_DAILY_LIMIT`

### Key 管理

- `GEMINI_API_KEY` 只在服务端环境变量。
- Vite 不再把 Key 注入前端。
- 未配置 Key 时返回 `503`，不会进入无效重试。

### 内容提示

命理/AI 内容必须加入免责声明：

- 内容仅供娱乐和自我反思。
- 不构成医疗、法律、投资、心理治疗建议。
- 若涉及严重心理危机，应提示用户联系专业帮助。

## 6. iOS 合规点

App Store 需要准备：

- Privacy Policy URL。
- Terms of Service URL。
- App Privacy 表单。
- 相机权限描述。
- AI/命理免责声明。
- IAP 商品说明。
- 恢复购买入口。

隐私标签建议：

- Contact Info：如果保存 email/phone。
- User Content：如果保存用户输入资料。
- Identifiers：如果使用账号 ID。
- Diagnostics：如果接入错误监控。

## 7. 日志与留存

默认：

- AI 请求日志：180 天。
- 审计事件：180 天。
- 订单和会员：按财务合规周期保留。
- 用户资料：保留到用户删除账号。

维护命令：

```bash
npm run db:purge
```

## 8. 生产安全清单

- `NODE_ENV=production`
- HTTPS only
- `CLIENT_ORIGINS` 精确白名单
- `CLIENT_CONNECT_SRC` 精确白名单
- Gemini Key 放密钥管理系统
- Apple/微信/支付宝私钥放密钥管理系统
- 数据库每日备份
- 错误监控接入
- 支付 webhook 验签
- 依赖扫描：`npm audit --audit-level=high`
