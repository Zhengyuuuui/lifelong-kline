# iOS 应用构建说明

## 为什么使用 Capacitor

产品要求前端 1:1 还原且交互不能变动，因此 iOS 端采用 Capacitor WebView 承载同一套 React/Vite 前端。这样可以最大限度保持 DOM、CSS、动画、三维组件、图表和弹窗与 Web 版本一致。

## 本地命令

- `npm run build:web`：只构建前端静态资源。
- `npm run ios:add`：首次生成 iOS 工程。
- `npm run ios:sync`：前端改动后重新同步到 iOS。
- `npm run ios:open`：打开 Xcode 工程。

## iOS 工程

iOS 工程位于 `ios/`。已配置：

- App ID：`com.lifekline.destiny`
- App Name：`人生K线`
- Web 资源目录：`dist`
- 相机权限：用于人脸估值和面相分析模块。

## 连接后端

本地 Web 开发默认同源 `/api`。iOS 真机和 App Store 版本需要设置：

```bash
VITE_API_BASE_URL=https://api.your-domain.com npm run ios:sync
```

如果调试时希望 Capacitor 直接加载远程 Web 页面，可设置：

```bash
CAPACITOR_SERVER_URL=https://app.your-domain.com npm run ios:sync
```

## App Store 前必须补齐

- Apple Developer Team、Bundle Identifier、签名证书和 Provisioning Profile。
- App Icon、Launch Screen 品牌图。
- App Store Connect 中创建并审核 Apple IAP 商品，商品 ID 与 `VITE_APPLE_IAP_MONTHLY_PRODUCT_ID` / `VITE_APPLE_IAP_LIFETIME_PRODUCT_ID` 保持一致。
- Sign in with Apple capability。
- 微信开放平台 iOS AppID、Universal Link、URL Scheme 与 WeChat OpenSDK。后端 `/api/auth/wechat` 已可用，iOS 原生层需要用审核后的 WeChat SDK 获取 `code`。
- 隐私政策、用户协议、命理/AI 内容免责声明。
- 生产 API 域名、HTTPS、CORS 白名单和日志/备份策略。
# iOS 生产桥接

前端已提供 `services/iosProductionBridge.ts`，Xcode 工程已内置 `ios/App/CapApp-SPM/Sources/CapApp-SPM/LifeKlineNativePlugin.swift`：

- `iosProductionBridge.signInWithApple()`：调用原生 Sign in with Apple，随后请求 `/api/auth/apple`。
- `iosProductionBridge.purchaseAppleProduct(productId)`：调用原生 StoreKit，随后请求 `/api/payment/verify-receipt`。
- `iosProductionBridge.restoreApplePurchases()`：调用原生恢复购买，逐笔请求 `/api/payment/verify-receipt`。

Capacitor 插件 `LifeKlineNative` 已暴露：

```ts
{
  signInWithApple(): Promise<{ identityToken: string; nonce?: string; nonceSha256?: string; fullName?: string; email?: string }>;
  purchaseAppleProduct(input: { productId: string }): Promise<{ receiptData: string; productId: string; transactionId?: string }>;
  restoreApplePurchases(): Promise<{ purchases: Array<{ receiptData: string; productId: string; transactionId?: string }> }>;
}
```

微信登录的前端和后端通道已准备好：`iosProductionBridge.signInWithWeChat()` 会把原生 SDK 返回的 `code` 发送到 `/api/auth/wechat`。正式接入时需在 Xcode 中加入 WeChat OpenSDK 并实现 `requestWeChatLoginCode()`。
