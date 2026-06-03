# ERNIE Image 文生图

## 协议

ERNIE Image 使用 OpenAI Images 兼容协议。

```http
POST https://tokendance.space/gateway/v1/images/generations
Authorization: Bearer {ERNIE_IMAGE_API_KEY}
Content-Type: application/json
```

## 请求

```json
{
  "model": "ernie-image",
  "prompt": "A cute cat playing with a ball of yarn",
  "n": 1,
  "size": "1024x1024"
}
```

## 首版约定

- 仅支持文生图，不支持参考图片。
- 固定生成 `1` 张图片。
- 固定使用 `1024x1024`，前端展示为 `1:1 / 1K`。
- 服务端从响应的 `data[0].url` 获取临时结果 URL。
- 服务端需要立即下载结果并转存到 Supabase Storage 私有 Bucket。
