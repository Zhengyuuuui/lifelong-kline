# 设计文档索引

建议阅读顺序：

1. [execution-runbook.md](./execution-runbook.md)：完整执行指令与命令顺序。
2. [agent-execution-instructions.md](./agent-execution-instructions.md)：后续开发者/Agent 执行约束。
3. [complete-commercial-design.md](./complete-commercial-design.md)：完整商用设计总蓝图。
4. [frontend-replication-design.md](./frontend-replication-design.md)：前端 1:1 复刻与验收策略。
5. [commercial-backend-architecture.md](./commercial-backend-architecture.md)：当前后端能力与环境变量。
6. [database-schema.md](./database-schema.md)：数据库 ERD、表设计与 Postgres 迁移。
7. [api-contract.md](./api-contract.md)：REST API 契约。
8. [openapi.yaml](./openapi.yaml)：机器可读 OpenAPI。
9. [payment-subscription-design.md](./payment-subscription-design.md)：Apple IAP、微信/支付宝与订阅设计。
10. [privacy-security-design.md](./privacy-security-design.md)：隐私、安全、合规与 AI 安全。
11. [production-deployment-design.md](./production-deployment-design.md)：生产部署、监控、备份与回滚。
12. [ios-release.md](./ios-release.md)：iOS 构建与 App Store 前置项。
13. [launch-readiness-checklist.md](./launch-readiness-checklist.md)：上线检查表。
14. [adr-001-commercial-app-shell-and-backend.md](./adr-001-commercial-app-shell-and-backend.md)：关键架构决策记录。

每次重要变更后建议执行：

```bash
npm run lint
npm run test:api
npm run build
npm run ios:sync
npm audit --audit-level=high
```

一键完整验证：

```bash
npm run verify:full
```
