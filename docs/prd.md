# 产品需求文档

## 项目概述

本项目是一个基于 Next.js 和 Supabase 的 AI 生图应用。具体产品目标和功能范围将在后续讨论中持续补充。

## 已确认需求

### 首页

#### 参考资料

- 首页视觉参考：`/docs/images/main.webp`
- 全部项目页视觉参考：`/docs/images/project.webp`

#### 页面目标

首页用于接收用户的生图需求，并提供最近项目入口。页面整体布局和视觉风格参考 `/docs/images/main.webp`。

#### 页面结构

- 页面上方主要区域展示产品标题和生图提示词输入框。
- 输入框下方展示“最近项目”区域。
- “最近项目”区域提供进入全部项目页的入口。

#### 提示词输入框

- 用户可以在输入框中输入生图需求的提示词。
- 输入框内提供 `+` 按钮。
- 点击 `+` 按钮后，用户可以上传图片。
- 首页输入框底部提供模式下拉，可选择 `Agent` 或 `直接生图`，默认使用 `Agent`。
- 首页 `Agent` 模式隐藏图像模型、宽高比和分辨率选择器；`直接生图` 模式展示这些参数。
- 输入框内提供发送按钮。
- 点击发送按钮后，创建项目并进入 Canvas 项目页面。`Agent` 模式先调用项目 Agent；`直接生图` 模式直接创建生图任务。

#### 页面跳转

- 点击发送按钮后，跳转至 Canvas 项目页面：`/canvas?projectId={projectId}`。
- Canvas 项目页面的其余功能细节持续确认。
- 首页输入框下方展示“最近项目”。
- 点击“查看全部”后，进入全部项目页：`/projects`。
- 全部项目页的视觉样式参考 `/docs/images/project.webp`。

### 全部项目页

#### 参考资料

- 页面视觉参考：`/docs/images/project.webp`

#### 页面目标

- `/projects` 页面用于查看全部项目。

### Canvas 项目页面

#### 参考资料

- Canvas 初始状态视觉参考：`/docs/images/cnavas_agent.webp`
- Canvas 工作状态视觉参考：`/docs/images/canvas_agent_2.png`

#### 页面目标

- Canvas 项目页面用于在无限画布中查看创作内容，并通过 Agent 聊天界面输入提示词进行生图。

#### 页面结构

- 页面左侧为无限画布区域。
- 页面右侧为 Agent 聊天界面。
- Agent 聊天界面底部提供聊天输入框。

#### Agent 生图交互

- 用户可以在 Agent 聊天输入框中输入生图提示词。
- 用户发送提示词后，Agent 根据提示词执行生图。
- 聊天输入框内提供 `+` 按钮。
- 点击 `+` 按钮后，用户可以上传图片。
- 在 Canvas 项目页面上传的图片作为生图参考图使用。

#### 视觉和功能参考

- Canvas 项目页面的其他界面元素和功能方向参考 `/docs/images/cnavas_agent.webp` 和 `/docs/images/canvas_agent_2.png`。
- 参考图中出现但尚未逐项确认的能力，统一记录在“待确认问题”中，不作为首版已确认范围。

### 生图 API 对接

#### 文生图

- 用户仅输入提示词、未提供参考图时，使用文生图能力。
- 文生图 API 对接参考以下文档：
  - `/docs/api/nanobanaa2.md`
  - `/docs/api/gpt_images_2_text_2image.md`
- GPT Image 2 文生图模型名称为：`gpt-image-2-text-to-image`。
- Nano Banana 2 模型名称为：`nano-banana-2`。
- ERNIE Image 模型名称为：`ernie-image`。
- ERNIE Image 使用 OpenAI Images 兼容协议：`POST /images/generations`。
- ERNIE Image 首版仅支持文生图，固定使用 `size=1024x1024`。

#### 图生图

- 用户输入提示词并上传参考图时，使用图生图能力。
- GPT Image 2 图生图 API 对接参考文档：`/docs/api/gpt_images_2_images_images.md`。
- Nano Banana 2 使用同一个 `nano-banana-2` 模型接口处理文生图和图生图。
- 当前图生图参考文档定义的任务创建接口为：`POST /api/v1/jobs/createTask`。
- 当前图生图参考文档定义的模型名称为：`gpt-image-2-image-to-image`。
- 图生图请求至少需要包含：
  - `input.prompt`：生图提示词。
  - `input.input_urls`：参考图片 URL 数组。
- 图生图接口支持通过可选参数 `callBackUrl` 接收任务完成通知。
- 图生图接口支持通过 `input.aspect_ratio` 设置生成图片宽高比。
- 图生图接口支持通过 `input.resolution` 设置生成图片分辨率。
- 用户选择 GPT Image 2 且上传参考图时，使用 `gpt-image-2-image-to-image`，参考图参数为 `input.input_urls`。
- 用户选择 Nano Banana 2 且上传参考图时，继续使用 `nano-banana-2`，参考图参数为 `input.image_input`。

#### 任务状态查询

- 本地开发阶段和回调兜底场景使用统一任务查询接口：`GET /api/v1/jobs/recordInfo?taskId={taskId}`。
- 第三方任务状态包括：`waiting`、`queuing`、`generating`、`success` 和 `fail`。
- 任务成功后，从 `data.resultJson` 中解析 `resultUrls`。
- 第三方生成结果 URL 可能过期。服务端获取成功结果后，需要及时下载图片并转存到 Supabase Storage 私有 Bucket。

## 已确认产品决策

- 产品命名不再使用旧名称；界面文案、文档和 API 对外表述中均避免出现旧名称。
- 新产品命名方向参考《给阿嬷的情书》中“木生”“南枝”的人物气质，需更具艺术特征。
- 首页采用 `/docs/images/main.webp` 所示的布局和视觉方向。
- 全部项目页路由为 `/projects`。
- Canvas 项目页面使用 `projectId` 作为查询参数，路由格式为 `/canvas?projectId={projectId}`。
- Canvas 项目页面采用左侧无限画布、右侧 Agent 聊天界面的双栏布局。
- Canvas 项目页面支持在 Agent 聊天输入框中上传图片作为生图参考图。
- 生图请求按照是否包含参考图区分文生图和图生图。
- 文生图 API 参考 `/docs/api/nanobanaa2.md` 和 `/docs/api/gpt_images_2_text_2image.md`。
- 图生图 API 参考 `/docs/api/gpt_images_2_images_images.md`。
- 生图任务查询 API 参考 `/docs/api/get-task-detail.md`。

## MVP 实施基线

以下内容属于可以直接按工程常规和核心用户路径确定的 MVP 基线。如果后续产品方向发生变化，再在此基础上调整。

### 首页

- 提示词为必填项。未填写提示词时，发送按钮不可用。
- 点击首页发送按钮时，创建新项目并生成 `projectId`，然后跳转至 `/canvas?projectId={projectId}`。
- 首页展示最近更新的 20 个项目，按更新时间倒序排列。
- 最近项目卡片展示项目封面、项目名称和更新时间。
- 点击最近项目卡片后，跳转至该项目的 `/canvas?projectId={projectId}`。
- 首页支持创建空白项目，创建后进入对应 Canvas 项目页面。
- 用户上传参考图片后，在输入区域展示缩略图预览，并支持移除。
- 项目名称根据用户的首条提示词自动生成。

### 全部项目页

- `/projects` 页面按更新时间倒序展示全部项目。
- 项目卡片展示项目封面、项目名称和更新时间。
- 点击项目卡片后，跳转至该项目的 `/canvas?projectId={projectId}`。
- `/projects` 页面支持创建空白项目。
- 首版使用分页或渐进加载，避免一次性加载全部项目。
- 首版支持项目重命名和删除。
- 首版暂不提供项目搜索。

### Canvas 项目页面

- 生图结果生成成功后，自动添加到左侧无限画布。
- 画布内容、Agent 聊天记录和生图任务状态需要持久化，用户再次进入项目时可以恢复。
- Canvas 上传参考图片后，在 Agent 输入区域展示缩略图预览，并支持移除。
- 生图任务展示排队中、生成中、成功和失败状态。失败状态支持重试。
- Agent 右侧面板首版采用固定宽度，并支持收起和展开。
- 画布首版至少支持拖拽平移、缩放、选中、移动和删除元素。
- 首版只实现核心画布能力，不加入文本、画笔、图层、评论、分享和导出等扩展工具。
- 用户可以将普通图片直接上传到画布。
- 无限画布底层使用 React Flow，依赖包为 `@xyflow/react`。
- 保存完整的画布视口状态，包括缩放比例和当前中心位置。
- 首版暂不提供从 Agent 历史消息中重复添加生成图片到画布的快捷操作。
- Canvas 右侧面板只提供一个对话输入框，不使用 `Agent` 和 `直接生图` 顶部 Tab。
- 输入框底部提供模式下拉，可选择 `Agent` 或 `直接生图`。
- `Agent` 模式隐藏图像模型、宽高比和分辨率选择器，由 Agent 根据用户需求调用生图工具。
- `直接生图` 模式展示图像模型、宽高比和分辨率选择器。
- 模式默认使用 `Agent`。用户切换后将选择保存在浏览器本地，跨刷新和项目复用。
- Agent 模式支持流式回复，可以讨论设计方向、优化提示词，并在用户明确要求生成图片时调用生图工具。
- Agent 首版只具备生图工具，不提供文件、Shell、资源列表查询或画布编辑工具。
- Agent 模式上传的参考图自动作为当前一轮生图工具调用的默认附件，不自动沿用到后续轮次。
- 首页和 Canvas 都支持 `Agent` / `直接生图` 模式切换；Canvas 内的失败任务继续支持重试。

### 数据和安全

- 首版要求用户登录后才能进入产品首页、项目库和 Canvas，并执行作画相关操作。
- 项目、聊天记录、画布元素、生图任务和用户上传资源需要关联所属登录用户。
- 用户数据默认私有。数据库表和 Storage Bucket 需要启用 RLS，并遵循最小权限原则。
- 旧游客会话仅用于迁移历史项目。用户登录后，当前浏览器游客 Cookie 对应的旧项目自动迁移到该账号。
- 未登录请求作画 API 时返回 401，并引导用户登录。
- 参考图片存储在 Supabase Storage 私有 Bucket 中。
- 调用第三方生图 API 时，由服务端生成短时有效的签名 URL，作为图生图接口的 `input.input_urls`。
- 第三方生图 API 必须由服务端调用，不允许在浏览器中暴露 API Key。
- 第三方 API Key、Supabase service role key 和回调密钥只能配置在服务端环境变量中。
- 第三方生成结果必须及时下载并转存到 Supabase Storage 私有 Bucket，不能将可能过期的第三方 URL 作为长期资源地址。
- Canvas Agent 使用服务端 Pi Agent 调用 Tokendance OpenAI 兼容网关，网关密钥不得暴露给浏览器。
- Pi Agent 会话从现有聊天消息表恢复，Pi transcript 保存到 `messages.metadata`，不新增数据库表。

### 生图模型和参数

- 文生图默认模型为 GPT Image 2。
- 模型选择器提供 GPT Image 2、Nano Banana 2 和 ERNIE Image。
- 用户可以选择宽高比和分辨率。
- 宽高比默认值为 `auto`。
- 分辨率默认值为 `1K`。
- 不同模型支持的宽高比和分辨率组合不同。前端选择器需要根据当前模型动态展示合法选项。
- GPT Image 2 使用 `aspect_ratio=auto` 时，只允许使用 `resolution=1K`。
- ERNIE Image 首版仅支持 `1:1` 宽高比和 `1K` 分辨率，不支持参考图。
- 上传图片支持 `JPG`、`PNG` 和 `WebP` 格式。
- 单张上传图片不超过 `10 MB`。
- 单次最多上传 `8` 张图片。
- 首版暂不限制用户每日生图次数。
- 首版限制单个用户最多同时存在 `2` 个进行中的生图任务。

## 联调事项

以下内容不属于产品决策，不阻塞当前 MVP 的界面和基础架构实现。

- 生产环境采用 `callBackUrl` Webhook 作为任务完成通知主路径，并保留服务端轮询作为兜底能力。
- Kie AI 官方文档已说明 Webhook HMAC 校验方式，但仍需在首次联调时抓取真实回调请求，确认回调 JSON 结构。

## 后续范围

- 是否加入跨浏览器项目分享或导入能力？
- 是否加入项目搜索？
- 是否加入从 Agent 历史消息中重复添加生成图片到画布的快捷操作？
- 是否加入文本、画笔、图层、评论、分享和导出等扩展工具？

## 技术文档状态

- `/docs/api/README.md`：已补充生图服务对接清单和环境变量约定。
- `/docs/api/get-task-detail.md`：已补充统一任务详情查询接口。
- `/docs/api/image-generation-callback.md`：已补充 Webhook HMAC 校验规则，真实回调 JSON 结构需要联调确认。
- `/docs/architecture.md`：已补充整体架构、Canvas 技术选型和任务流转。
- `/docs/database.md`：已补充数据库模型草案。
- `/docs/storage.md`：已补充 Bucket、对象路径和访问策略草案。
- `/docs/auth.md`：已补充登录必需和旧游客项目迁移策略。
- `/docs/env.md`：已补充本地开发和生产环境变量清单。
