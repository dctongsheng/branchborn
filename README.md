# Branchborn AI 设计画布

基于 Next.js、Supabase 和 React Flow 的 AI 生图应用。首版支持游客会话、项目管理、参考图上传、文生图与图生图、无限画布、任务轮询、Kie AI Webhook 和 ERNIE Image 文生图。

GitHub 仓库：[dctongsheng/branchborn](https://github.com/dctongsheng/branchborn)

## 本地运行

```bash
npm install
cp .env.example .env.local
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。

如果本地只配置公开 Supabase 变量，应用会使用 `.data/` 下的本地持久化和演示生成图片，便于完整体验流程。配置 `SUPABASE_SERVICE_ROLE_KEY` 和对应模型 API Key 后，服务端会切换到 Supabase 私有 Storage 和真实生图服务。

## Docker Compose 部署

Branchborn 提供仅应用容器的 Docker Compose 部署方式，默认连接外部 Supabase、Kie AI 和 Tokendance 服务。

```bash
cp .env.docker.example .env.docker
docker compose build
docker compose up -d
```

启动后访问 [http://localhost:3000](http://localhost:3000)。健康检查地址为 [http://localhost:3000/api/health](http://localhost:3000/api/health)。

部署前需要把 `.env.docker` 中的占位值替换为真实配置。Docker 生产环境必须配置 Supabase、Kie AI、Tokendance 和 Webhook HMAC Key；缺少配置时 `/api/health` 会返回 503，应用不会回退到 `.data` 演示存储。生产环境需要将 `APP_URL` 设置为公开可访问的 HTTPS 域名，并由外部反向代理或托管平台负责 TLS。

生产 Webhook 地址为：

```text
https://你的域名/api/webhooks/kie-ai
```

## 数据库初始化

确认目标 Supabase 项目后，执行迁移：

```bash
supabase db push
```

迁移文件位于 `supabase/migrations/20260601000000_branchborn_mvp.sql`，会创建业务表、RLS 策略和私有 `ai-images` Bucket。

## 文档

- 产品需求：`docs/prd.md`
- 架构说明：`docs/architecture.md`
- 数据库设计：`docs/database.md`
- 环境变量：`docs/env.md`
- 生图 API：`docs/api/README.md`
