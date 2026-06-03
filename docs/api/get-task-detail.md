# Kie AI 统一任务详情查询

官方文档：https://docs.kie.ai/market/common/get-task-detail

## 用途

查询通过 Kie AI Market 模型创建的任务状态和生成结果。GPT Image 2 和 Nano Banana 2 均使用该统一查询接口。

## 请求

```http
GET https://api.kie.ai/api/v1/jobs/recordInfo?taskId={taskId}
Authorization: Bearer {IMAGE_API_KEY}
```

## 状态枚举

- `waiting`：任务等待处理。
- `queuing`：任务位于处理队列中。
- `generating`：任务正在生成。
- `success`：任务生成成功。
- `fail`：任务生成失败。

## 成功响应关键字段

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "taskId": "task_12345678",
    "model": "gpt-image-2-text-to-image",
    "state": "success",
    "param": "{\"model\":\"gpt-image-2-text-to-image\"}",
    "resultJson": "{\"resultUrls\":[\"https://example.com/generated-content.jpg\"]}",
    "failCode": "",
    "failMsg": "",
    "progress": 100
  }
}
```

`param` 和 `resultJson` 是 JSON 字符串，需要在服务端解析。

## 轮询策略

- 本地开发阶段使用服务端轮询。
- 首次轮询间隔建议为 `3` 秒。
- 连续轮询时使用指数退避。
- 最长轮询时间设为 `15` 分钟。
- 状态为 `success` 时，立即下载 `resultUrls` 中的资源并转存到 Supabase Storage。
- 状态为 `fail` 时，记录 `failCode` 和 `failMsg`，并允许用户重试。

## 资源有效期

官方文档说明生成内容 URL 通常会在 `24` 小时后过期。业务数据库不能把第三方 URL 当作永久资源地址，必须转存到 Supabase Storage。
