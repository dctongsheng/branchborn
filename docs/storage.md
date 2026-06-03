# Storage 设计草案

## Bucket

- Bucket 名称通过服务端环境变量 `SUPABASE_STORAGE_BUCKET` 配置。
- 默认 Bucket 名称为 `ai-images`。
- Bucket 必须设置为私有，不允许公开读取。

## 对象路径

建议使用以下对象路径：

```text
projects/{projectId}/{assetId}/{filename}
```

路径中不写入 API Key、游客 Cookie 或其他敏感信息。

## 上传限制

- 支持格式：`JPG`、`PNG` 和 `WebP`。
- 单张图片最大 `10 MB`。
- 单次最多上传 `8` 张图片。
- 浏览器和服务端都需要执行校验。

## 访问策略

- 浏览器上传前，由服务端校验项目所有权。
- 用户查看项目资源时，由服务端或受控的签名 URL 提供访问权限。
- 第三方图生图 API 需要访问参考图时，由服务端生成短时有效的签名 URL。
- 签名 URL 的有效期应尽可能短，首版建议使用 `10` 分钟。
- 第三方生成结果 URL 可能过期。任务成功后，服务端需要立即下载图片并转存到私有 Bucket。
- 数据库只保存 Supabase Storage 对象路径，不使用第三方临时 URL 作为长期资源地址。

## RLS 和安全

- 登录用户只能访问自己项目下的资源。
- 游客资源通过服务端游客会话校验访问。
- 不允许将 Bucket 设置为公开 Bucket。
- 不允许在浏览器中使用 `SUPABASE_SERVICE_ROLE_KEY`。
