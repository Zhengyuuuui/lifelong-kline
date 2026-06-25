# API 契约设计

## 基础约定

Base URL：

- 本地 Web：`http://127.0.0.1:3000`
- iOS/生产：由 `VITE_API_BASE_URL` 指向线上 API。

认证：

- Web：`HttpOnly` Cookie `life_session`。
- iOS/远程客户端：`Authorization: Bearer <sessionToken>`。
- 生产 Apple/微信登录：`POST /api/auth/apple` 或 `POST /api/auth/wechat` 返回 `accessToken` 和 `refreshToken`；客户端用 `Authorization: Bearer <accessToken>` 调用生产接口。

统一成功响应：

```json
{
  "ok": true
}
```

统一错误响应：

```json
{
  "ok": false,
  "error": {
    "message": "Validation failed",
    "details": {
      "field": "reason"
    }
  }
}
```

## 端点

### `GET /api/health`

健康检查。

成功：

```json
{
  "ok": true,
  "service": "life-kline-api",
  "db": "data/life-kline.sqlite",
  "time": "2026-06-04T00:00:00.000Z"
}
```

### `GET /api/postgres/health`

生产 Postgres 健康检查。用于部署平台探活和发布后确认迁移是否完成。

成功：

```json
{
  "ok": true,
  "service": "life-kline-postgres-api",
  "database": "life_kline",
  "requiredTablesReady": true,
  "latencyMs": 12,
  "time": "2026-06-05T00:00:00.000Z"
}
```

### `GET /api/session`

恢复会话。未登录也返回 `200`。

未登录：

```json
{
  "ok": true,
  "authenticated": false
}
```

已登录：

```json
{
  "ok": true,
  "authenticated": true,
  "user": {},
  "profile": {},
  "membership": {},
  "settings": {}
}
```

### `POST /api/auth/passwordless`

创建或恢复 passwordless 会话。

请求：

```json
{
  "provider": "apple",
  "clientInstallationId": "device-or-installation-id",
  "displayName": "天命用户",
  "email": "optional@example.com",
  "phone": "+8613800000000"
}
```

Provider：

- `wechat`
- `apple`
- `google`
- `phone`
- `email`
- `guest`

成功返回 `sessionToken`，Web 同时设置 HttpOnly Cookie。

### `POST /api/auth/logout`

撤销当前会话。需要登录。

### `POST /api/auth/apple`

生产 iOS Apple 登录。服务端会校验 Apple identity token，创建或恢复用户，并签发 JWT。

请求：

```json
{
  "identityToken": "apple.identity.jwt",
  "nonce": "optional-raw-nonce",
  "nonceSha256": "optional-sha256-base64url-nonce",
  "fullName": "optional display name",
  "email": "optional@example.com"
}
```

成功：

```json
{
  "ok": true,
  "authenticated": true,
  "tokenType": "Bearer",
  "accessToken": "jwt",
  "refreshToken": "jwt",
  "sessionToken": "jwt",
  "expiresIn": 900,
  "user": {},
  "profile": null
}
```

### `POST /api/auth/wechat`

生产微信登录。服务端用授权 `code` 换取 openid/unionid，并签发 JWT。

请求：

```json
{
  "code": "wechat-oauth-code"
}
```

### `POST /api/auth/refresh`

刷新生产 JWT access token。

请求：

```json
{
  "refreshToken": "refresh.jwt"
}
```

### `GET /api/me`

获取当前用户 bundle。需要登录。

### `GET /api/user/me`

生产 Postgres 用户中心接口。需要 JWT。

成功返回：

```json
{
  "ok": true,
  "user": {},
  "profile": {},
  "membership": {}
}
```

### `POST /api/profile`

保存命盘资料。需要登录。

请求：

```json
{
  "profile": {
    "name": "测试用户",
    "gender": "male",
    "birthDate": "1990-01-01",
    "birthTime": "12:00",
    "birthPlace": "上海"
  },
  "bazi": {
    "age": 36,
    "epoch_label": "测试",
    "hexagram_main": "乾",
    "wuxing_tendency": "平衡",
    "useful_elements": ["水"],
    "avoid_elements": ["火"],
    "luck_cycle": "测试"
  }
}
```

### `POST /api/user/profile`

生产 Postgres 资料保存接口。需要 JWT。

请求：

```json
{
  "profile": {
    "name": "测试用户",
    "gender": "male",
    "birthDate": "1990-01-01",
    "birthTime": "12:00",
    "birthPlace": "上海"
  },
  "derivedAiFoundation": {
    "age": 36,
    "wuxing_tendency": "平衡"
  }
}
```

### `POST /api/user/settings`

生产用户设置保存接口。需要 JWT。

```json
{
  "settings": {
    "notifications": true,
    "language": "中文 / EN"
  }
}
```

### `POST /api/user/bindings`

生产账号绑定状态保存接口。需要 JWT。

```json
{
  "bindings": {
    "phone": "138****8888",
    "wechat": true
  }
}
```

### `POST /api/user/share-count`

生产分享解锁计数保存接口。需要 JWT。

```json
{
  "shareCount": 3
}
```

### `DELETE /api/user/account`

生产账号注销接口。需要 JWT。服务端软删除用户并撤销 refresh tokens。

### `POST /api/ai/generate`

生产 AI 生成接口。需要 JWT。服务端从 `user_profiles` 读取姓名、性别、出生日期等资料，并在后端构建提示词与调用模型。

请求：

```json
{
  "feature": "life_book",
  "locale": "zh-CN",
  "responseFormat": "json",
  "input": {
    "scene": "manual_page",
    "page": 1
  }
}
```

Feature：

- `bazi_report`
- `life_book`
- `life_kline`
- `smooth_sailing`
- `valuation`
- `revenue_forecast`
- `chat`

成功：

```json
{
  "ok": true,
  "generation": {
    "id": "uuid",
    "feature": "life_book",
    "model": "gemini-3.5-flash",
    "result": {},
    "quota": {
      "used": 1,
      "limit": 20,
      "membershipActive": false
    },
    "createdAt": "2026-06-05T00:00:00.000Z"
  }
}
```

### `POST /api/membership/checkout`

创建订单。需要登录。

请求：

```json
{
  "plan": "lifetime",
  "provider": "apple",
  "amountCents": 1880
}
```

Plan：

- `monthly`
- `lifetime`

Provider：

- `apple`
- `wechat`
- `alipay`

mock 模式成功后直接返回 `status: "paid"`。

### `POST /api/membership/confirm`

确认 live 支付回执。需要登录。

请求：

```json
{
  "orderId": "uuid",
  "providerOrderId": "apple-transaction-id",
  "receipt": "provider-receipt"
}
```

### `POST /api/payment/verify-receipt`

生产 Apple IAP 校验接口。需要 JWT。服务端优先验 StoreKit 2 `signedTransactionInfo`，缺失时兼容 Apple verifyReceipt，支持 sandbox/production 自动切换，并更新 `orders` 与 `memberships`。

请求：

```json
{
  "signedTransactionInfo": "storekit-2-transaction-jws",
  "receiptData": "base64-receipt",
  "productId": "com.lifekline.monthly",
  "transactionId": "optional-transaction-id",
  "environment": "auto"
}
```

### `POST /api/webhooks/apple`

App Store Server Notifications V2 回调。由 Apple 服务端调用，不使用用户 JWT。请求体必须包含 Apple `signedPayload`，服务端使用 Apple Root Certificates 验签并解码。

请求：

```json
{
  "signedPayload": "apple-signed-jws"
}
```

成功：

```json
{
  "ok": true,
  "webhook": {
    "status": "processed",
    "notificationType": "DID_RENEW",
    "notificationUUID": "uuid-from-apple"
  }
}
```

处理结果：

- `processed`：通知已验签、已处理。
- `duplicate`：相同 `notificationUUID` 已处理过。
- `unmatched`：通知有效，但当前数据库还没有匹配到对应用户或原始交易，可后续对账。

成功：

```json
{
  "ok": true,
  "payment": {
    "verified": true,
    "orderId": "uuid",
    "status": "success",
    "productId": "com.lifekline.monthly",
    "transactionId": "apple-transaction-id",
    "environment": "sandbox",
    "expiresAt": "2026-07-05T00:00:00.000Z",
    "active": true
  },
  "membership": {}
}
```

### `POST /api/settings`

保存用户设置。需要登录。

```json
{
  "settings": {
    "notifications": true,
    "language": "中文 / EN"
  }
}
```

### `POST /api/bindings`

保存账号绑定状态。需要登录。

```json
{
  "bindings": {
    "phone": "138****8888",
    "wechat": true
  }
}
```

### `POST /api/share-count`

保存分享解锁计数。需要登录。

```json
{
  "shareCount": 3
}
```

### `DELETE /api/account`

软删除账号并撤销会话。需要登录。

### `POST /api/gemini/generateContent`

Gemini 非流式代理。

请求体透传：

```json
{
  "model": "gemini-3.5-flash",
  "contents": "prompt or structured contents",
  "config": {}
}
```

服务端会执行：

- Gemini Key 检查。
- 匿名/免费/会员额度检查。
- 请求日志记录。
- 失败状态映射。

### `POST /api/gemini/generateContentStream`

Gemini SSE 流式代理。

响应：

```text
data: {"text":"..."}

data: [DONE]
```

## 状态码

| 状态码 | 含义 |
| --- | --- |
| `200` | 成功 |
| `204` | CORS preflight |
| `401` | 未登录 |
| `422` | 请求体校验失败 |
| `429` | 限流或 AI 额度耗尽 |
| `500` | 服务端错误 |
| `503` | AI provider 未配置或不可用 |
