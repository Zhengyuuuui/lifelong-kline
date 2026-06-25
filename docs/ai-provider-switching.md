# AI Provider Switching Runbook

目标：正式商用后可替换底层大模型供应商，同时保持当前版本的内容规则、字段结构、语气风格和安全边界不漂移。

## 核心原则

- 前端不保存任何 AI key，也不直接调用供应商 API。
- 所有 AI 生成统一进入后端 provider 层：`server/aiProvider.ts`。
- 业务 prompt 和产品风格由后端注入 `LIFE_KLINE_MODEL_INVARIANT_CONTRACT_V1`，不能放到某个供应商 SDK 的私有逻辑里。
- 换模型只改环境变量，不改前端 UI、交互、文案结构或业务 schema。
- 默认不允许前端指定真实模型，防止旧模块传入 Gemini 模型名后污染 OpenAI-compatible / Claude 路由。

## Provider 配置

### Gemini

```bash
AI_PROVIDER=gemini
GEMINI_API_KEY=...
AI_MODEL=gemini-3.5-flash
AI_FALLBACK_MODELS=gemini-3.1-flash-lite,gemini-flash-latest
```

### OpenAI 官方

```bash
AI_PROVIDER=openai
OPENAI_API_KEY=...
AI_MODEL=gpt-4o-mini
AI_FALLBACK_MODELS=
```

### OpenAI-compatible 供应商

适用于 DeepSeek、通义千问、Kimi、OpenRouter、火山、硅基流动、自建 vLLM 等兼容 `/chat/completions` 的服务。

```bash
AI_PROVIDER=openai-compatible
AI_API_KEY=...
AI_API_BASE_URL=https://provider.example.com/v1
AI_MODEL=provider-model-name
AI_FALLBACK_MODELS=provider-backup-model-name
```

### Anthropic Claude

```bash
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=...
AI_MODEL=claude-3-5-haiku-latest
AI_FALLBACK_MODELS=
```

## 稳定性参数

```bash
AI_TEMPERATURE=0.68
AI_TOP_P=0.9
AI_MAX_OUTPUT_TOKENS=4096
AI_TIMEOUT_MS=45000
AI_CONTRACT_VERSION=life-kline-v1
AI_ALLOW_CLIENT_MODEL_OVERRIDE=false
AI_DISABLE_NATIVE_RESPONSE_FORMAT=false
```

- `AI_ALLOW_CLIENT_MODEL_OVERRIDE=false`：生产必须保持默认，避免前端旧兼容请求改变真实模型。
- `AI_DISABLE_NATIVE_RESPONSE_FORMAT=false`：默认让支持 JSON 模式的 provider 使用原生 JSON 输出；若某个 OpenAI-compatible 厂商不支持该参数，可临时设为 `true`，仍会通过 prompt contract 保持 JSON 输出要求。

## 换模型上线检查

1. 配好 provider 环境变量。
2. 执行 `npm run preflight:prod`。
3. 执行 `npm run verify:full`。
4. 用 3 个固定用户档案分别生成：
   - `bazi_report`
   - `life_book`
   - `life_kline`
   - `smooth_sailing`
   - `chat`
5. 对比字段是否完整、语言是否正确、是否保持当前产品的“人生K线 / 人生使用说明书”语气。
6. 检查 `ai_history.model`，应记录为 `provider:model`。

## 不能改动

- 不要把 AI key 写回前端。
- 不要删除 `MODEL_INVARIANT_CONTRACT`。
- 不要让不同功能各自绕开 `server/aiProvider.ts`。
- 不要在 prompt 中引入供应商专属身份设定，例如“你是 Claude”或“你是 ChatGPT”。
- 不要为了某个模型把 JSON 字段名、UI 文案、模块结构改掉。
