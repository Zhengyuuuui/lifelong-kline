# 《虎皮椒支付接入最小改动设计方案》

## 1. 当前可复用代码

### 可复用后端入口与路由结构

当前项目已经有统一 Express 后端入口，支付相关代码集中在：

- `server/postgres/payment.controller.ts`
- `server/postgres/payment.service.ts`
- `server/database.ts`
- `server/validation.ts`
- `components/PaymentModal.tsx`

现有 `payment.controller.ts` 已经提供了支付路由模式、鉴权方式、限流方式、错误处理方式。

现有 `payment.service.ts` 已经有订单写入、会员开通、权益生成、审计日志等逻辑，可以作为虎皮椒接入的参考。

### 可复用数据表

Postgres 迁移中已经有：

- `orders`
- `memberships`
- `users`
- `audit_events`
- `api_rate_limits`

其中 `orders` 和 `memberships` 已具备支付闭环基础，但需要为虎皮椒补充少量字段。

### 可复用前端支付弹窗

`components/PaymentModal.tsx` 目前已经有微信、支付宝、Apple Pay 入口和支付状态 UI，可以保留弹窗外壳，把模拟支付逻辑替换为真实创建订单、展示二维码或跳转链接、轮询订单状态。

## 2. 当前订单与会员模型

### orders 表字段

从 `db/migrations/001_phase1_auth_schema.sql` 和后续迁移看，生产 Postgres 的 `orders` 表已有字段：

- `id`
- `user_id`
- `transaction_id`
- `product_id`
- `payment_provider`
- `payment_status`
- `purchase_token`
- `environment`
- `amount_cents`
- `currency`
- `raw_receipt`
- `created_at`
- `updated_at`
- `paid_at`
- `failed_at`
- `original_transaction_id`
- `provider_payload_hash`
- `verified_at`

当前订单状态枚举为：

- `pending`
- `success`
- `failed`
- `refunded`
- `cancelled`

客户明确不做退款，所以 `refunded` 可以保留历史兼容，但虎皮椒一期不实现退款 API 和退款后台。

### memberships 表字段

`memberships` 表已有字段：

- `id`
- `user_id`
- `source_order_id`
- `product_id`
- `status`
- `entitlements`
- `started_at`
- `expires_at`
- `created_at`
- `updated_at`
- `original_transaction_id`
- `current_transaction_id`

会员状态枚举为：

- `inactive`
- `active`
- `expired`
- `revoked`

### 当前会员开通逻辑

生产 Postgres 的会员开通逻辑在：

- `server/postgres/payment.service.ts`

Apple IAP 支付成功后，会执行：

1. 校验 Apple 收据。
2. 写入或更新 `orders`。
3. 根据 `source_order_id` 写入或更新 `memberships`。
4. 生成 `entitlements`。
5. 写入 `audit_events`。

### 当前 mock checkout / confirm

本地兼容层在 `server/database.ts` 中有：

- `createOrder(userId, plan, provider, amountCents, rawPayload?)`
- `markOrderPaid(userId, orderId, providerOrderId?)`

对应校验在 `server/validation.ts`。

当前 mock checkout 接收前端传来的 `amountCents`，这只能用于本地模拟，不能用于真实支付。虎皮椒接入时必须改为前端只传 `productId` 或 `planId`，金额由后端价格表决定。

### 当前 Apple IAP 写入方式

Apple IAP 当前写入：

- `payment_provider = 'apple_iap'`
- `payment_status = success / failed / refunded`
- `transaction_id`
- `original_transaction_id`
- `raw_receipt`
- `provider_payload_hash`
- `verified_at`
- `paid_at`
- `memberships.source_order_id`

这套模式可以复用于虎皮椒，但不能继续硬编码 `apple_iap`。

### 当前 PaymentModal 模拟逻辑

`components/PaymentModal.tsx` 目前：

- 微信 / 支付宝展示假二维码。
- 通过定时器模拟扫码、处理中、成功。
- 最终调用 `onSuccess`。
- Apple 分支也只是模拟成功。

虎皮椒接入后，微信 / 支付宝分支需要替换成真实后端订单创建和状态轮询。

## 3. 当前缺口

### 未发现虎皮椒支付模块

当前没有发现完整的：

- 虎皮椒创建支付订单接口
- `notify_url` 回调接口
- 虎皮椒签名生成逻辑
- 回调验签逻辑
- 虎皮椒订单状态更新逻辑
- 虎皮椒订单状态查询接口
- 前端真实支付二维码 / 跳转链接接入

### 已有订单和会员表，但字段不完全够用

当前 `orders` 可以承载一部分支付信息，但缺少更清晰的商户订单号、服务商流水号、回调接收时间、回调记录表。

### 当前 mock 存在前端金额风险

`validateCheckoutPayload` 允许前端传 `amountCents`，真实支付不能沿用这个设计。

### 高亮风险：amount_cents 与 total_fee 单位不同

当前项目内部使用：

```text
amount_cents
```

单位是“分”。

虎皮椒官方发起支付接口和回调中的：

```text
total_fee
```

单位是“元”，格式应为 `decimal(18,2)` 字符串。

因此调用虎皮椒时必须做安全转换：

```text
amount_cents = 1880
↓
total_fee = "18.80"
```

回调验签通过后，也必须把虎皮椒回调里的 `total_fee` 转换回“分”，再和本地 `orders.amount_cents` 比较。

明确禁止：

- 禁止把 `amount_cents` 原样传给虎皮椒 `total_fee`。
- 禁止用浮点数直接做金额比较。
- 禁止前端传金额并由后端直接使用。

建议：

- 金额转换使用“整数分到字符串元”的安全转换函数。
- 回调金额校验必须严格一致。
- `total_fee` 与本地 `orders.amount_cents` 不一致时，不能开通会员。

## 4. 最小新增文件清单

建议新增：

1. `server/postgres/xunhupay.service.ts`

   负责虎皮椒下单、签名、验签、回调处理、订单状态更新、会员开通。

2. `server/postgres/xunhupay.controller.ts`

   负责暴露创建订单、支付回调、订单状态查询接口。

3. `server/postgres/xunhupay.sign.ts`

   负责签名生成、签名校验、常量时间比较。也可以先内聚在 service 内，但独立文件更清楚。

4. `db/migrations/004_xunhupay_payment_fields.sql`

   增加虎皮椒所需字段和回调记录表。

## 5. 最小修改文件清单

建议最小修改：

1. `server/postgres/index.ts`

   注册虎皮椒支付路由。

2. `server/postgres/payment.controller.ts`

   可选择不改，保留 Apple IAP。虎皮椒建议单独路由，减少互相影响。

3. `server/postgres/payment.service.ts`

   可抽出会员权益生成逻辑，供虎皮椒复用。为了最小改动，也可以先在 `xunhupay.service.ts` 中复用同样规则，后续再整理。

4. `server/postgres/env.ts`

   增加虎皮椒环境变量读取和校验。

5. `.env.example`

   增加虎皮椒配置模板。

6. `components/PaymentModal.tsx`

   替换模拟支付逻辑为真实支付流程。

7. `services/backendClient.ts`

   增加创建支付订单、查询订单状态接口封装。

8. `App.tsx`

   支付成功后不要再走 mock checkout，应刷新用户会员状态。

## 6. 数据库字段建议

### 可以复用的字段

- `orders.payment_provider`：用于记录 `xunhupay`。
- `orders.payment_status`：继续使用 `pending / success / failed / cancelled`。
- `orders.amount_cents`：必须以后端价格表写入。
- `orders.currency`：建议固定 `CNY`。
- `orders.raw_receipt`：可以复用为 `raw_notify` 的存储位置，但字段名偏 Apple，长期建议新增更通用字段或回调表。
- `orders.provider_payload_hash`：可用于存储回调 payload hash，辅助幂等。
- `orders.verified_at`：可用于记录验签通过时间。
- `orders.paid_at`：支付成功时间。
- `memberships.source_order_id`：支付成功后关联订单开通会员。

### 建议新增字段

建议在 `orders` 表新增：

```sql
merchant_order_no text
provider_trade_no text
provider_order_id text
notify_received_at timestamptz
```

说明：

- `merchant_order_no`：本系统生成的商户订单号，对应虎皮椒 `trade_order_id`。
- `provider_trade_no`：虎皮椒返回的支付流水号。
- `provider_order_id`：如果虎皮椒还有内部订单 ID，可单独保留。
- `notify_received_at`：收到支付回调的时间。

### 虎皮椒官方字段映射表

| 本系统字段 | 虎皮椒字段 | 说明 |
| --- | --- | --- |
| `orders.merchant_order_no` | `trade_order_id` | 本系统生成的商户订单号 |
| `orders.provider_trade_no` | `transaction_id` | 虎皮椒支付流水号 |
| `orders.provider_order_id` | `open_order_id` | 虎皮椒开放订单号 |
| `orders.amount_cents` | 本地金额 | 单位为分 |
| 虎皮椒 `total_fee` | 支付金额 | 单位为元，字符串两位小数 |
| `payment_callbacks.payload` | 完整 form 回调字段 | 保存虎皮椒回调原始字段 |
| `orders.notify_received_at` | notify 到达时间 | 收到有效回调时间 |
| `orders.verified_at` | 验签通过时间 | 回调签名校验通过时间 |
| `orders.paid_at` | 支付成功时间 | 只有 `status=OD` 后写入 |

说明：

- `raw_receipt` 可以短期复用，但字段名偏 Apple，不建议长期承载所有虎皮椒回调。
- 更推荐新增 `payment_callbacks` 表保存完整回调。
- 不做退款也要保留支付流水和回调日志，方便后续对账和争议排查。

### 建议新增 payment_callbacks 表

建议新增：

```sql
payment_callbacks (
  id uuid primary key,
  payment_provider text not null,
  merchant_order_no text,
  provider_trade_no text,
  payload_hash text not null,
  payload jsonb not null default '{}',
  signature_valid boolean not null default false,
  processing_status text not null default 'received',
  error_message text,
  received_at timestamptz not null default now(),
  processed_at timestamptz
)
```

用途：

- 保存虎皮椒原始回调。
- 支持重复回调排查。
- 支持验签失败审计。
- 支持后续后台查看支付流水。
- 不做退款也建议保留这张表，方便未来追溯。

## 7. 环境变量建议

考虑当前项目已有 `PAYMENTS_MODE`，建议不要把 mode 和 provider 混在一起。

推荐：

```bash
PAYMENTS_MODE=live
PAYMENTS_PROVIDER=xunhupay

XUNHUPAY_APP_ID=
XUNHUPAY_SECRET=
XUNHUPAY_GATEWAY=https://api.xunhupay.com/payment/do.html
XUNHUPAY_GATEWAY_BACKUP=https://api.dpweixin.com/payment/do.html
XUNHUPAY_NOTIFY_URL=
XUNHUPAY_RETURN_URL=
XUNHUPAY_CALLBACK_URL=

PUBLIC_SITE_URL=
```

可选：

```bash
XUNHUPAY_CURRENCY=CNY
XUNHUPAY_TIMEOUT_SECONDS=300
```

注意：

- `XUNHUPAY_SECRET` 只能来自环境变量。
- 日志里不能输出完整密钥。
- `XUNHUPAY_NOTIFY_URL` 必须是公网 HTTPS 地址。
- `XUNHUPAY_RETURN_URL` 只能用于用户体验，不能作为开通会员依据。
- `XUNHUPAY_CALLBACK_URL` 用于用户取消支付或中断后可返回的页面地址。

## 8. 虎皮椒官方接口约束

### 发起支付网关

后端发起支付时，需要 POST 到虎皮椒官方网关：

```text
https://api.xunhupay.com/payment/do.html
```

备用网关：

```text
https://api.dpweixin.com/payment/do.html
```

后端请求虎皮椒时必须包含或处理这些字段：

```text
version=1.1
appid
trade_order_id
total_fee
title
time
notify_url
return_url
callback_url
nonce_str
hash
```

字段说明：

- `trade_order_id` 对应本系统 `merchant_order_no`。
- `total_fee` 是金额，单位为元，格式为两位小数字符串，例如 `"18.80"`。
- `notify_url` 是虎皮椒异步回调地址，必须是公网 HTTPS。
- `return_url` 只用于用户支付成功后的页面体验，不能作为开通会员依据。
- `callback_url` 是用户取消支付或中断后可返回的页面地址。
- `title` 是订单标题，不能让前端随意传入敏感或超长内容，应由后端根据产品配置生成。
- `time` 由后端生成。
- `nonce_str` 由后端生成。
- `hash` 由后端使用虎皮椒密钥生成。
- 虎皮椒密钥不能进入前端。

### 金额单位转换

虎皮椒 `total_fee` 不能直接使用本地 `amount_cents`。

正确转换示例：

```text
orders.amount_cents = 1880
xunhupay.total_fee = "18.80"
```

回调处理时，必须反向转换并严格比较：

```text
xunhupay.total_fee = "18.80"
↓
notifyAmountCents = 1880
↓
notifyAmountCents === orders.amount_cents
```

实现要求：

- 使用整数分到字符串元的安全转换函数。
- 使用字符串解析到整数分的安全转换函数。
- 禁止直接用 JavaScript 浮点数比较金额。
- 回调金额不一致时，只记录回调，不开通会员。

### 签名算法约束

虎皮椒签名规则：

1. 取所有非空参数。
2. 排除 `hash` 参数本身。
3. 按参数名 ASCII 从小到大排序。
4. 拼接成 `key=value&key=value` 格式。
5. 最后直接拼接 `APPSECRET`。
6. 对最终字符串做 MD5。
7. 得到 32 位小写 `hash`。

回调验签时必须使用收到的全部字段参与签名，不能只挑固定字段。

重要约束：

- 官方未来可能增加字段，所以验签实现必须支持扩展字段。
- 不能硬编码只验 `appid`、`trade_order_id`、`total_fee`、`status`。
- 应该基于实际收到的 payload，排除 `hash` 和空值后统一排序签名。
- 日志不能输出完整 `APPSECRET`。
- 比较 `hash` 建议使用常量时间比较，避免时序攻击。

### notify_url 请求格式

虎皮椒付款成功通知是：

```text
POST
Content-Type: application/x-www-form-urlencoded
```

因此 Express 必须支持：

```ts
express.urlencoded({ extended: false })
```

如果当前项目只用了：

```ts
express.json()
```

则 notify 回调可能解析不到 `body`。

实现要求：

- notify 路由必须支持 `form-urlencoded`。
- 可以全局启用，也可以只针对 `/api/payment/xunhupay/notify` 启用。
- 需要保存原始字段到 `payment_callbacks.payload`。
- 回调接口是公开接口，不使用 JWT，但必须验签。

### notify_url 成功响应

虎皮椒要求商户服务器收到并处理成功后，返回纯文本：

```text
success
```

不能返回：

```json
{ "success": true }
```

也不能返回：

```text
OK
```

建议代码意图：

```ts
res.status(200).type("text/plain").send("success");
```

如果返回内容不是 `success`，虎皮椒可能会继续重试回调。

### 回调状态判断

虎皮椒回调里的 `status` 必须判断。

只有：

```text
OD
```

代表已支付，可以把订单改为 `success` 并开通会员。

其他状态，例如：

```text
CD
RD
UD
```

一期不做退款，不能处理为支付成功。

处理原则：

- `status !== "OD"` 时，只记录回调，不开通会员。
- 客户当前不做退款，所以 `CD/RD/UD` 只做日志记录和后台展示预留。
- 不做退款不等于可以忽略支付状态字段。

### 虎皮椒返回字段映射

虎皮椒发起支付成功后，可能返回：

```text
url
url_qrcode
errcode
errmsg
hash
```

前端字段建议映射为：

```text
payUrl    <- url
qrCodeUrl <- url_qrcode
```

使用原则：

- 移动端优先使用 `payUrl`。
- PC 端优先展示 `qrCodeUrl`。
- 不要依赖前端 `return_url` 判断支付成功。
- 前端轮询的是本系统订单状态接口，不是直接查虎皮椒。

## 9. 接口设计

建议保持现有项目风格，使用 singular payment 路由：

```text
POST /api/payment/xunhupay/create
POST /api/payment/xunhupay/notify
GET  /api/payment/orders/:orderId/status
```

如果后续希望支付模块更标准化，也可以改为：

```text
POST /api/payments/xunhupay/create
POST /api/payments/xunhupay/notify
GET  /api/orders/:orderId/status
```

我建议一期采用第一组，和现有 `/api/payment/verify-receipt` 保持一致。

### POST /api/payment/xunhupay/create

鉴权：需要登录。

请求参数：

```json
{
  "productId": "life_kline_lifetime",
  "payType": "wechat"
}
```

不允许传：

```json
{
  "amount": 1880,
  "amountCents": 188000
}
```

后端处理：

1. 校验用户登录。
2. 前端只允许传 `productId` 和 `payType`。
3. 不允许前端传金额。
4. 校验 `productId` 是否在后端价格表。
5. 后端决定 `amount_cents`、`currency`、`product_id` 和订单标题。
6. 后端把 `amount_cents` 安全转换为虎皮椒 `total_fee`。
7. 后端生成唯一 `merchant_order_no`，映射为虎皮椒 `trade_order_id`。
8. 创建 `orders`，状态为 `pending`。
9. 后端生成 `time`、`nonce_str`、`hash`。
10. 后端请求虎皮椒支付网关。
11. 后端保存虎皮椒返回摘要，例如 `url`、`url_qrcode`、`errcode`、`errmsg`、`hash`。
12. 后端返回 `payUrl` / `qrCodeUrl` 给前端。

返回示例：

```json
{
  "orderId": "uuid",
  "merchantOrderNo": "LK20260622123456789",
  "paymentProvider": "xunhupay",
  "paymentStatus": "pending",
  "amountCents": 1880,
  "currency": "CNY",
  "payUrl": "https://...",
  "qrCodeUrl": "https://..."
}
```

虎皮椒返回字段映射：

```text
payUrl    <- url
qrCodeUrl <- url_qrcode
```

安全校验：

- 金额以后端为准。
- 订单号后端生成。
- 支付 provider 固定为 `xunhupay`。
- 创建订单接口需要限流。
- 订单标题由后端生成，不能完全透传前端输入。
- `XUNHUPAY_SECRET` 不能出现在响应、前端代码或日志中。

### POST /api/payment/xunhupay/notify

鉴权：公开接口，不使用 JWT。

请求格式：

```text
POST application/x-www-form-urlencoded
```

安全依赖：

- 虎皮椒签名验签。
- appid 匹配。
- 订单号匹配。
- 金额匹配。
- `status` 匹配。
- 幂等处理。

Express 解析要求：

```ts
express.urlencoded({ extended: false })
```

后端处理：

1. 记录回调 payload hash。
2. 保存完整 form 字段到 `payment_callbacks.payload`。
3. 使用收到的全部字段验签，排除 `hash` 和空值。
4. 校验 `appid`。
5. 根据 `trade_order_id` 查找 `orders.merchant_order_no`。
6. 校验订单存在。
7. 把回调 `total_fee` 转换为整数分，并和 `orders.amount_cents` 严格比较。
8. 判断 `status`。
9. 只有 `status=OD` 才允许把订单改为 `success` 并开通会员。
10. `status=CD/RD/UD` 时，只记录回调，不开通会员。
11. 如果订单已 `success`，直接返回纯文本 `success`，不重复开会员。
12. 如果订单未成功，更新 `orders.payment_status = 'success'`。
13. 写入 `paid_at`、`provider_trade_no`、`provider_order_id`、`verified_at`、`notify_received_at`。
14. 写入或更新 `memberships`。
15. 写入 `audit_events`。
16. 返回虎皮椒要求的纯文本成功字符串。

成功响应必须是：

```ts
res.status(200).type("text/plain").send("success");
```

失败情况：

- 签名错误：返回 400，不更新订单。
- 金额不一致：返回 400，不开通会员。
- 订单不存在：返回 404 或 400，不开通会员。
- `status !== "OD"`：记录回调，不开通会员。
- 重复回调：返回纯文本 `success`，但不重复开通会员。
- 成功时返回纯文本 `success`。
- 失败时不返回 `success`，或按错误场景记录后返回合适状态。

### GET /api/payment/orders/:orderId/status

鉴权：需要登录。

后端处理：

1. 校验订单属于当前用户。
2. 返回订单状态。
3. 如果已支付，返回会员状态。
4. 不能直接信任前端 `return_url`。

返回示例：

```json
{
  "orderId": "uuid",
  "paymentStatus": "success",
  "membershipStatus": "active",
  "paidAt": "2026-06-22T..."
}
```

用途：

- 前端轮询支付状态。
- 用户关闭 `return_url` 页面也不影响会员开通。
- 支付成功必须以后端 notify 为准。
- 该接口查询的是本系统本地订单状态，不是直接查询虎皮椒。

## 10. 订单查询与补偿查询说明

当前一期保留本系统订单状态查询接口：

```text
GET /api/payment/orders/:orderId/status
```

该接口用于前端轮询本地订单状态。

如果未来做“虎皮椒主动查询补偿”，虎皮椒官方查询接口是：

```text
POST https://api.xunhupay.com/payment/query.html
```

查询参数不是 `trade_order_id`，而是：

```text
out_trade_order
```

或者：

```text
open_order_id
```

二选一。

字段映射：

- `out_trade_order` 对应本系统 `merchant_order_no`。
- `open_order_id` 对应本系统 `provider_order_id`。

补偿查询用途：

- 用于 `notify_url` 延迟或丢失时确认订单状态。
- 可以作为后续增强，不要求一期必须实现。
- 如果一期不做主动查询，必须依赖 `notify_url` 和前端轮询本地订单状态。

## 11. 前端改造点

`components/PaymentModal.tsx` 建议最小改造：

1. 用户选择微信或支付宝。
2. 点击支付按钮。
3. 前端调用：

```text
POST /api/payment/xunhupay/create
```

4. 后端返回 `orderId`、`payUrl`、`qrCodeUrl`。
5. PC 端优先展示 `qrCodeUrl`。
6. 移动端优先使用 `payUrl` 跳转。
7. 前端每 2 秒调用：

```text
GET /api/payment/orders/:orderId/status
```

8. 订单状态为 `success` 后：
   - 停止轮询。
   - 关闭弹窗。
   - 刷新用户会员状态。
   - 展示支付成功状态。

需要特别调整：

- 不再通过前端定时器直接模拟成功。
- 不再调用 mock `checkout / confirm` 来开通会员。
- `return_url` 回来只做展示和触发状态查询，不直接开会员。
- 前端关闭页面后，后端 notify 仍然可以完成会员开通。
- 前端轮询的是本系统订单状态接口，不是直接查询虎皮椒。

## 12. 编码前强制约束清单

进入编码前必须确认：

- Node 22+ 环境正常。
- 本地 `npm run dev` 正常。
- 确认 Postgres 迁移路径。
- 确认 production 使用 Postgres，不用本地 SQLite。
- 确认虎皮椒 `appid` 和 `secret` 通过环境变量注入。
- 确认 `notify_url` 是公网 HTTPS。
- 确认 `return_url` 只是展示用途。
- 确认金额以后端价格表为准。
- 确认 `amount_cents` 和 `total_fee` 的单位转换。
- 确认 notify 支持 `form-urlencoded`。
- 确认回调成功返回纯文本 `success`。
- 确认 `status=OD` 才开通会员。
- 确认重复回调不会重复开通会员。
- 确认 `payment_callbacks` 保存完整回调。
- 确认客户一期不做退款。

## 13. 测试清单

必须覆盖：

1. 正常创建虎皮椒支付订单。
2. 正常支付成功，notify 到达后订单变为 `success`。
3. 支付成功后自动开通会员。
4. 用户取消支付，订单保持 `pending` 或后续标记 `cancelled`。
5. 用户重复点击支付，不产生异常重复会员。
6. 虎皮椒重复发送回调，接口幂等。
7. 回调签名错误，不更新订单。
8. 回调金额不一致，不更新订单，不开通会员。
9. 回调订单号不存在，不开通会员。
10. 订单已支付后再次回调，不重复写会员。
11. 前端关闭页面后支付成功，后端仍可通过 notify 开通会员。
12. 支付成功但 `return_url` 没回来，用户重新打开页面后会员状态仍正确。
13. 前端尝试篡改金额，后端仍按价格表下单。
14. 非本人查询订单状态，返回拒绝。
15. `XUNHUPAY_SECRET` 缺失时，生产启动或创建支付应明确失败。
16. `total_fee` 单位转换测试。
17. 回调 `total_fee` 与本地 `amount_cents` 不一致测试。
18. `form-urlencoded` 回调解析测试。
19. 回调返回纯文本 `success` 测试。
20. `status=OD` 成功测试。
21. `status=CD/RD/UD` 不开通会员测试。
22. `hash` 使用全部字段验签测试。
23. `hash` 排除自身字段测试。
24. 虎皮椒新增未知字段后验签仍通过测试。
25. `url` / `url_qrcode` 映射测试。
26. 手机端 `payUrl` 跳转测试。
27. PC 端 `qrCodeUrl` 展示测试。
28. 重复 notify 不重复开通会员测试。
29. 订单已 `success` 再收到 notify 返回 `success` 测试。
30. 前端 `return_url` 丢失但 notify 成功后会员仍开通测试。

## 14. 不做退款后的影响

客户明确不做退款，所以一期可以不做：

- 退款 API
- 退款回调
- 退款后台审核
- 退款按钮
- 退款流水闭环

但建议仍然保留：

- `provider_trade_no`
- `paid_at`
- `raw_notify`
- `payment_callbacks`
- `payment_status`

这样未来如果客户要追溯支付、人工核账、处理争议，后台有据可查。

后台订单页一期只展示支付状态，不提供退款按钮。

注意：

- 不做退款不等于可以忽略虎皮椒 `status` 字段。
- `CD/RD/UD` 一期只记录到回调日志和后台展示预留，不触发退款逻辑，也不能开通会员。

## 15. 是否建议现在开始编码

建议可以进入编码阶段，但先确认以下外部信息：

1. 虎皮椒官方接口文档版本，确认网关地址、签名算法、回调参数、成功响应格式与本文一致。
2. 生产域名，用于配置 `notify_url` 和 `return_url`。
3. 取消或中断支付后的 `callback_url` 页面地址。
4. 虎皮椒商户 `appid` 和密钥，由环境变量注入，不要写进代码。

当前项目已经具备最小接入虎皮椒支付的基础：

- 有 Express 后端。
- 有订单表。
- 有会员表。
- 有支付路由模式。
- 有前端支付弹窗。
- 有生产构建和启动路径。

总判断：该文档已修缮到可以进入虎皮椒支付编码阶段，但编码时不能跳过字段迁移、金额单位转换、form-urlencoded notify 解析、完整字段验签、`status=OD` 判断和回调幂等设计。最小改动路径是：新增虎皮椒 service/controller/sign 工具，扩展 orders 字段，新增 payment_callbacks 表，然后改造 PaymentModal 接真实支付与轮询。
