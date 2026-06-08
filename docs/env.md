# 环境变量说明

## 本地开发必需

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=ai-images
IMAGE_API_BASE_URL=https://api.kie.ai
IMAGE_API_KEY=
TOKENDANCE_API_BASE_URL=https://tokendance.space/gateway/v1
TOKENDANCE_API_KEY=
PI_AGENT_MODEL=deepseek-v4-flash
ERNIE_IMAGE_API_BASE_URL=https://tokendance.space/gateway/v1
ERNIE_IMAGE_API_KEY=
APP_URL=http://localhost:3000
```

说明：

- `NEXT_PUBLIC_SUPABASE_URL`：Supabase 项目 URL，可以暴露给浏览器。
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`：Supabase Publishable Key 或 Anon Key，可以暴露给浏览器。
- `SUPABASE_SERVICE_ROLE_KEY`：仅服务端使用。游客模式下，服务端需要使用该密钥执行经过所有权校验的数据库和 Storage 操作。
- `SUPABASE_STORAGE_BUCKET`：私有图片 Bucket 名称，默认使用 `ai-images`。
- `IMAGE_API_BASE_URL`：Kie AI API 基础地址，默认使用 `https://api.kie.ai`。
- `IMAGE_API_KEY`：Kie AI API Key，仅服务端使用。
- `TOKENDANCE_API_BASE_URL`：Tokendance OpenAI 兼容网关地址，供 ERNIE Image 和 Canvas Pi Agent 共用。
- `TOKENDANCE_API_KEY`：Tokendance 网关密钥，仅服务端使用。
- `PI_AGENT_MODEL`：Canvas Pi Agent 使用的聊天模型，默认使用 `deepseek-v4-flash`。
- `ERNIE_IMAGE_API_BASE_URL`、`ERNIE_IMAGE_API_KEY`：旧版 ERNIE Image 配置。仅作为兼容回退，新部署优先使用统一 Tokendance 配置。
- `APP_URL`：应用访问地址。本地开发使用 `http://localhost:3000`。

## 生产环境额外必需

```bash
IMAGE_API_WEBHOOK_HMAC_KEY=
```

说明：

- `IMAGE_API_WEBHOOK_HMAC_KEY`：在 Kie AI 设置页面生成的 Webhook HMAC Key，用于验证生产环境回调签名。
- 生产环境的 `APP_URL` 需要替换为公开可访问的 HTTPS 域名。

## Docker Compose 部署

Docker Compose 部署使用 `.env.docker` 注入运行时配置：

```bash
cp .env.docker.example .env.docker
```

`.env.docker` 的变量含义与 `.env.local` 一致，但用于容器运行环境。该文件包含真实密钥时不要提交到 Git，仓库只提交 `.env.docker.example` 作为模板。

Compose 只启动 Branchborn 应用容器，不自托管 Supabase。`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`、`SUPABASE_SERVICE_ROLE_KEY` 和第三方 API Key 均应指向外部服务。

如果没有配置可用的 `SUPABASE_SERVICE_ROLE_KEY`，应用会回退到容器内 `/app/.data` 的本地演示持久化；`docker-compose.yml` 已将该路径挂载为命名卷。正式生产数据仍建议使用 Supabase 数据库和私有 Storage。

## 安全约定

- 不要把真实密钥提交到 Git。
- 不要将 `SUPABASE_SERVICE_ROLE_KEY`、`IMAGE_API_KEY`、`TOKENDANCE_API_KEY`、`ERNIE_IMAGE_API_KEY` 或 `IMAGE_API_WEBHOOK_HMAC_KEY` 暴露给浏览器。
- 本地真实值写入 `.env.local`。
- Docker Compose 部署时将真实值写入 `.env.docker`；托管平台部署时在平台环境变量设置中配置真实值。
