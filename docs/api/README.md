# 生图 API 对接清单

## 已有文档

- `gpt_images_2_images_images.md`：GPT Image 2 图生图任务创建接口。
- `gpt_images_2_text_2image.md`：GPT Image 2 文生图任务创建接口。
- `nanobanaa2.md`：Nano Banana 2 生图任务创建接口，支持可选参考图。
- `get-task-detail.md`：统一任务详情查询接口。
- `image-generation-callback.md`：生产回调 HMAC 校验规则。
- `ernie-image.md`：ERNIE Image OpenAI Images 兼容文生图接口。

## 已知接口

- API 基础地址：`https://api.kie.ai`
- 创建任务：`POST /api/v1/jobs/createTask`
- 查询任务：`GET /api/v1/jobs/recordInfo?taskId={taskId}`
- 鉴权方式：`Authorization: Bearer <API_KEY>`
- GPT Image 2 文生图模型：`gpt-image-2-text-to-image`
- GPT Image 2 图生图模型：`gpt-image-2-image-to-image`
- Nano Banana 2 模型：`nano-banana-2`
- 创建任务成功后返回 `data.taskId`。
- ERNIE Image 接口基础地址：`https://tokendance.space/gateway/v1`
- ERNIE Image 文生图：`POST /images/generations`

## 模型路由

- 用户选择 GPT Image 2 且没有参考图时，使用 `gpt-image-2-text-to-image`。
- 用户选择 GPT Image 2 且存在参考图时，使用 `gpt-image-2-image-to-image`。
- 用户选择 Nano Banana 2 时，使用 `nano-banana-2`。参考图通过 `input.image_input` 传入。
- 用户选择 ERNIE Image 时，使用 `ernie-image`。首版仅支持文生图，固定发送 `size=1024x1024`。

## 业务上传限制

- 产品统一限制为每次最多上传 `8` 张参考图，每张不超过 `10 MB`。
- 该限制低于 GPT Image 2 图生图接口的最多 `16` 张限制。
- 该限制低于 Nano Banana 2 接口的最多 `14` 张、每张不超过 `30 MB` 限制。

## 服务端环境变量

- `IMAGE_API_BASE_URL`：生图 API 基础地址，默认值为 `https://api.kie.ai`。
- `IMAGE_API_KEY`：生图服务 API Key，只能在服务端读取。
- `ERNIE_IMAGE_API_BASE_URL`：ERNIE Image OpenAI 兼容接口基础地址。
- `ERNIE_IMAGE_API_KEY`：ERNIE Image API Key，只能在服务端读取。
- `APP_URL`：应用公开访问地址，用于拼接回调 URL。
- `IMAGE_API_WEBHOOK_HMAC_KEY`：Kie AI Webhook HMAC 校验密钥。
- `SUPABASE_STORAGE_BUCKET`：参考图和生成图片使用的 Supabase Storage Bucket 名称。
- `SUPABASE_SERVICE_ROLE_KEY`：仅在服务端后台任务或回调需要绕过用户会话执行受控更新时使用。

## 安全约定

- 不允许将 `IMAGE_API_KEY`、`ERNIE_IMAGE_API_KEY`、`SUPABASE_SERVICE_ROLE_KEY` 或访问令牌暴露给浏览器。
- 图生图参考图片应存储在私有 Bucket 中，并通过短时有效的签名 URL 提供给第三方生图服务。
- 回调处理需要保证幂等，避免第三方重复通知造成重复写入。
- 第三方生成结果 URL 可能过期，必须尽快下载并转存到 Supabase Storage。
