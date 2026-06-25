# 执行指令 Runbook

## 0. 工作目录

所有命令都在项目根目录执行：

```bash
cd /Users/liuxiao/Documents/Codex/2026-06-04/files-mentioned-by-the-user-remix/product-source
```

## 1. 首次安装

```bash
npm ci
npm run preflight
```

如果 `npm ci` 因 lockfile 或 Node 版本失败，先确认：

```bash
node -v
npm -v
```

要求 Node 22+，因为本地预览后端使用 `node:sqlite`，生产后端使用 Postgres。

## 2. 本地开发启动

```bash
npm run dev
```

打开：

```text
http://127.0.0.1:3000
```

健康检查：

```bash
curl http://127.0.0.1:3000/api/health
```

Postgres 生产后端健康检查：

```bash
curl http://127.0.0.1:3000/api/postgres/health
```

如需真实 AI：

```bash
GEMINI_API_KEY=你的key npm run dev
```

## 3. 每次改动后的验证

最小验证：

```bash
npm run lint
npm run test:api
```

完整验证：

```bash
npm run verify:full
```

完整验证包含：

- TypeScript 类型检查。
- API smoke test。
- Web + 后端生产构建。
- 高危依赖扫描。

## 4. 前端 1:1 验收截图

启动服务后执行：

```bash
npx -y playwright screenshot --viewport-size=1280,720 --wait-for-timeout=3000 http://127.0.0.1:3000 verification-home.png
npx -y playwright screenshot --viewport-size=390,844 --wait-for-timeout=3000 http://127.0.0.1:3000 verification-mobile.png
```

验收重点：

- 首屏不空白。
- 底部导航不遮挡。
- 人生说明书封面居中。
- 登录/支付弹窗视觉不变。
- iOS 尺寸下文字不溢出。

## 5. iOS 工程同步

首次生成 iOS 工程：

```bash
npm run ios:add
```

每次前端或配置改动后同步：

```bash
npm run ios:sync
```

打开 Xcode：

```bash
npm run ios:open
```

真机或 TestFlight 版本需要设置线上 API：

```bash
VITE_API_BASE_URL=https://api.your-domain.com npm run ios:sync
```

## 6. 生产构建

```bash
npm run build
```

运行生产服务：

```bash
NODE_ENV=production npm run start
```

生产必须设置：

```bash
NODE_ENV=production
DATABASE_URL=postgres://user:password@host:5432/life_kline
DATABASE_SSL=true
JWT_ACCESS_SECRET=至少32位随机字符串
JWT_REFRESH_SECRET=另一组至少32位随机字符串
APPLE_CLIENT_ID=com.lifekline.destiny
APPLE_BUNDLE_ID=com.lifekline.destiny
APPLE_IAP_PRODUCT_IDS=com.lifekline.monthly,com.lifekline.yearly,com.lifekline.lifetime
APPLE_SHARED_SECRET=...
CLIENT_ORIGINS=https://app.your-domain.com,capacitor://localhost
CLIENT_CONNECT_SRC=https://api.your-domain.com
PAYMENTS_MODE=live
GEMINI_API_KEY=...
```

生产数据库首次初始化或升级：

```bash
npm run db:postgres:migrate
curl https://api.your-domain.com/api/postgres/health
```

生产预检：

```bash
npm run preflight:prod
```

## 7. 数据库维护

查看表行数：

```bash
npm run db:stats
```

备份：

```bash
npm run db:backup
```

压缩和 WAL checkpoint：

```bash
npm run db:vacuum
```

清理旧 AI/审计日志：

```bash
DATA_RETENTION_DAYS=180 npm run db:purge
```

生产 Postgres 迁移：

```bash
npm run db:postgres:migrate
```

## 8. 上线前执行顺序

```bash
npm ci
npm run db:postgres:migrate
npm run preflight:prod
npm run verify:full
VITE_API_BASE_URL=https://api.your-domain.com npm run ios:sync
npm run db:backup
```

然后：

1. Xcode 选择 Release 配置。
2. 选择正确 Team 和 Bundle ID。
3. Archive。
4. 上传 App Store Connect。
5. TestFlight 冒烟测试。
6. 提交审核。

## 9. 回滚指令

代码回滚：

```bash
npm run build
NODE_ENV=production npm run start
```

本地 SQLite 数据库回滚：

1. 停止服务。
2. 复制最近备份覆盖 `SQLITE_PATH`。
3. 启动服务。
4. 执行订单对账。

SQLite 备份恢复示例：

```bash
cp backups/life-kline-YYYY-MM-DD.sqlite data/life-kline.sqlite
npm run db:stats
```

生产 Postgres 回滚原则：

1. 优先用向前修复迁移，不直接删表。
2. 支付/会员异常先按 `transaction_id` 和 `orders` 记录对账修正。
3. 必要时恢复云数据库快照，再重放 Apple IAP 对账结果。

## 10. 下一阶段执行顺序

建议按以下顺序继续开发：

1. 在原生 iOS 层接 Apple Sign in、WeChat OAuth、StoreKit，并调用已实现的生产 API。
2. 在用户中心增加恢复购买入口，调用 `/api/payment/verify-receipt`。
3. 增加 App Store Server Notification webhook，用于订阅续费、退款、过期事件。
4. 增加运营后台和订单对账页面。
5. 接 Sentry 或同类错误监控。
6. 规划 SQLite 到 Postgres 迁移脚本。
7. 加 Playwright 视觉回归基线。
