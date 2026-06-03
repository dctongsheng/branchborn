# 数据库设计草案

## 目标

为首页项目列表、Canvas 持久化、Agent 聊天、生图任务和资源文件提供基础数据模型。正式创建数据库前，需要通过 Supabase MCP 检查现有 Schema，并将最终 SQL 迁移记录到仓库。

## 所有权模型

- Branchborn 主路径使用 `user_id` 关联 Supabase Auth 用户。
- `guest_session_hash` 仅用于兼容旧游客项目迁移。数据库只保存其哈希值，不保存 Cookie 原文。
- 每条私有业务数据必须归属于一个登录用户；旧游客数据会在登录后迁移到用户。
- API 查询必须校验当前登录用户是否拥有对应资源。

## 建议数据表

### `projects`

- `id`：UUID，主键。
- `user_id`：UUID，可空，关联登录用户。
- `guest_session_hash`：文本，可空，仅用于旧游客项目迁移。
- `name`：文本，根据首条提示词自动生成，可重命名。
- `cover_asset_id`：UUID，可空，关联项目封面资源。
- `viewport`：JSONB，保存 React Flow 缩放比例和中心位置。
- `created_at`：时间戳。
- `updated_at`：时间戳。

### `messages`

- `id`：UUID，主键。
- `project_id`：UUID，关联项目。
- `role`：文本，取值为 `user`、`agent` 或 `system`。
- `content`：文本。
- `metadata`：JSONB，保存模型、参数和关联资源等扩展信息。
- `created_at`：时间戳。

### `canvas_nodes`

- `id`：UUID，主键。
- `project_id`：UUID，关联项目。
- `node_type`：文本，首版取值为 `generated_image` 或 `uploaded_image`。
- `position`：JSONB，保存 React Flow 节点位置。
- `size`：JSONB，保存节点尺寸。
- `asset_id`：UUID，关联资源文件。
- `metadata`：JSONB，保存节点扩展数据。
- `created_at`：时间戳。
- `updated_at`：时间戳。

### `generation_tasks`

- `id`：UUID，主键。
- `project_id`：UUID，关联项目。
- `message_id`：UUID，可空，关联发起生图的用户消息。
- `provider`：文本，例如 `kie.ai`。
- `model`：文本。
- `task_type`：文本，取值为 `text_to_image` 或 `image_to_image`。
- `provider_task_id`：文本，可空，第三方任务 ID。
- `status`：文本，取值为 `queued`、`processing`、`succeeded` 或 `failed`。
- `prompt`：文本。
- `parameters`：JSONB，保存宽高比、分辨率和参考图等参数。
- `error_message`：文本，可空。
- `created_at`：时间戳。
- `updated_at`：时间戳。

### `assets`

- `id`：UUID，主键。
- `project_id`：UUID，关联项目。
- `asset_type`：文本，取值为 `reference_image`、`uploaded_image` 或 `generated_image`。
- `storage_path`：文本，Supabase Storage 对象路径。
- `mime_type`：文本。
- `file_size`：整数，单位为字节。
- `width`：整数，可空。
- `height`：整数，可空。
- `created_at`：时间戳。

## 索引建议

- `projects.updated_at`：支持最近项目排序。
- `projects.user_id`：支持所有权查询。
- `projects.guest_session_hash`：仅支持旧游客项目迁移查询。
- `messages.project_id, created_at`：支持恢复聊天记录。
- `canvas_nodes.project_id`：支持恢复画布。
- `generation_tasks.project_id, created_at`：支持恢复任务状态。
- `generation_tasks.provider_task_id`：支持轮询或回调更新任务。
- `assets.project_id`：支持项目资源查询。

## RLS 原则

- 登录用户只能访问 `user_id = auth.uid()` 的数据。
- 新建项目写入 `user_id`，不再写入 `guest_session_hash`。
- 使用 `SUPABASE_SERVICE_ROLE_KEY` 的服务端路由必须保持最小操作范围。
