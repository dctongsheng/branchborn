# Kie AI 生图任务回调

官方文档：https://docs.kie.ai/common-api/webhook-verification

## 用途

生产环境可以在创建生图任务时传入 `callBackUrl`。任务完成后，Kie AI 会向该地址发送回调。回调模式可以减少轮询请求。

## 回调地址

建议使用：

```text
{APP_URL}/api/webhooks/kie-ai
```

## HMAC 校验

Kie AI 使用 HMAC-SHA256 生成回调签名。

回调请求头：

- `X-Webhook-Timestamp`：Unix 时间戳，单位为秒。
- `X-Webhook-Signature`：Base64 编码后的签名。

签名规则：

```text
base64(HMAC-SHA256(taskId + "." + timestamp, IMAGE_API_WEBHOOK_HMAC_KEY))
```

服务端处理回调时需要：

1. 从请求头读取时间戳和签名。
2. 从请求体读取 `taskId`。
3. 校验时间戳是否在允许的时间窗口内，首版建议不超过 `5` 分钟。
4. 使用 `IMAGE_API_WEBHOOK_HMAC_KEY` 计算签名。
5. 使用常量时间比较函数校验签名。
6. 根据 `taskId` 幂等更新本地任务。

## 待联调确认

- 真实回调 JSON 请求体的完整结构。
- 回调失败后的重试次数和退避策略。
- 成功结果 URL 在回调请求体中的具体字段位置。

即使启用回调，服务端仍应保留统一任务查询接口作为兜底能力。
