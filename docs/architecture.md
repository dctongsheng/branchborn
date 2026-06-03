# 技术架构说明

## 项目技术栈

- Web 框架：Next.js App Router。
- 数据和文件存储：Supabase Database、Supabase Storage。
- 无限画布：React Flow，依赖包为 `@xyflow/react`。
- 生图服务：由 Next.js 服务端路由代理调用第三方生图 API。
- Canvas Agent：使用 `@earendil-works/pi-agent-core`，底层通过 `@earendil-works/pi-ai` 接入 Tokendance OpenAI 兼容网关。

## Canvas 技术选型

无限画布使用 React Flow。

选择原因：

- React Flow 使用 MIT 许可证。
- React Flow 开箱支持节点拖拽、缩放、平移、多选和增删元素。
- React Flow 支持自定义 React 节点，适合将生成图片和用户上传图片建模为画布节点。
- 首版仅需要核心画布能力，不需要引入完整白板编辑器。

## 核心数据流

### 首页发起生图

1. 用户输入提示词，可选上传参考图，并在输入框底部选择 `Agent` 或 `直接生图` 模式。
2. 服务端创建项目，并根据首条提示词生成项目名称。
3. `Agent` 模式先调用项目 Agent；Agent 可以回复设计问题，并在需要时调用生图工具。
4. `直接生图` 模式直接创建生图任务。
5. 页面跳转至 `/canvas?projectId={projectId}`。
6. 前端轮询任务状态。
7. 生图成功后，服务端下载第三方结果图片并转存到 Supabase Storage。
8. 将转存后的图片添加为画布节点并更新项目封面。

### Canvas 发起生图

1. 用户在右侧对话框输入设计需求，可选上传参考图，并在输入框底部选择 `Agent` 或 `直接生图` 模式。图像模型、宽高比和分辨率选择器仅在 `直接生图` 模式显示。
2. `Agent` 模式通过 SSE 调用服务端 Pi Agent。Agent 可以回复设计问题，并在用户明确要求生成图片时调用唯一的 `generate_image` 工具。
3. `直接生图` 模式跳过 Agent，直接创建生图任务。
4. 两种模式与首页流程复用同一个生图任务编排服务。如果存在参考图，调用图生图 API；否则调用文生图 API。
5. 前端轮询任务状态。生图成功后，服务端下载第三方结果图片并转存到 Supabase Storage，再添加为 React Flow 图片节点。

### Canvas Agent 会话恢复

- Pi Agent 的用户消息、assistant 消息和工具结果保存在现有 `messages.metadata.piMessage` 字段中。
- 页面刷新后，服务端从项目消息表重建 Pi 上下文，不需要额外的 Agent 会话表。
- 浏览器 SSE 中断不会取消已经创建的生图任务，任务仍由现有轮询链路推进。

### 图片上传

1. 浏览器校验图片格式、单张大小和单次上传数量。
2. 图片上传至 Supabase Storage 私有 Bucket。
3. 画布普通图片上传完成后，创建对应的 React Flow 图片节点。
4. 生图参考图上传完成后，由服务端生成短时有效的签名 URL，再提交给第三方图生图 API。

## 登录策略

- 首版要求登录后才能进入 Branchborn 首页、项目库和 Canvas。
- Branchborn 数据使用 Supabase Auth 用户 ID 作为所有权边界。
- 旧游客 Cookie 仅用于登录后自动迁移历史项目，迁移完成后删除。
- 未登录调用 Branchborn API 返回 401，未登录访问 Branchborn 页面跳转登录页。

## 首版边界

- 画布节点首版支持生成图片和用户上传图片。
- 画布交互首版支持拖拽平移、缩放、选中、移动和删除。
- 暂不实现文本、画笔、图层、评论、分享和导出。
- 本地开发阶段使用服务端轮询查询生图任务状态。
- 生产环境使用第三方 Webhook 回调作为主路径，并保留服务端轮询作为兜底能力。

## 关联文档

- 数据库表结构和 RLS 策略：`/docs/database.md`。
- Storage Bucket、对象路径和访问策略：`/docs/storage.md`。
- 登录和游客会话迁移策略：`/docs/auth.md`。
- 生图 API 细节：`/docs/api/README.md`。
