import { Agent, type AgentMessage, type AgentTool } from "@earendil-works/pi-agent-core";
import { Type } from "@earendil-works/pi-ai";
import { isBranchbornAuthError, requireBranchbornUser } from "@/lib/branchborn/auth";
import { createGenerationTask } from "@/lib/branchborn/generation";
import { messageText, PI_AGENT_SYSTEM_PROMPT, piAgentApiKey, piAgentModel, restoredPiMessages } from "@/lib/branchborn/pi-agent";
import { addMessage, getProject } from "@/lib/branchborn/store";
import type { ModelId } from "@/lib/branchborn/types";

const VALID_MODELS = new Set<ModelId>(["gpt-image-2", "nano-banana-2", "ernie-image"]);

function sse(data: unknown) {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireBranchbornUser().catch((error) => {
    if (isBranchbornAuthError(error)) return null;
    throw error;
  });
  if (!user) return Response.json({ error: "请先登录" }, { status: 401 });
  const projectId = (await params).id;
  const project = await getProject(user.id, projectId);
  if (!project) return Response.json({ error: "项目不存在" }, { status: 404 });
  const body = await request.json();
  const prompt = String(body.prompt || "").trim();
  if (!prompt) return Response.json({ error: "请输入消息" }, { status: 400 });
  const defaultModel = VALID_MODELS.has(body.model) ? body.model as ModelId : "gpt-image-2";
  const defaultAspectRatio = String(body.aspectRatio || "auto");
  const defaultResolution = String(body.resolution || "1K");
  const referenceAssetIds = Array.isArray(body.referenceAssetIds) ? body.referenceAssetIds.slice(0, 8) : [];
  const encoder = new TextEncoder();
  let agent: Agent | undefined;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: unknown) => {
        try {
          controller.enqueue(encoder.encode(sse(payload)));
        } catch {
          // The generation task continues if the browser closes the stream.
        }
      };
      let latestUserMessageId: string | undefined;
      try {
        const apiKey = piAgentApiKey();
        const generateImageParameters = Type.Object({
          prompt: Type.String({ description: "用于生图的完整提示词" }),
          model: Type.Optional(Type.String({ description: "可选图片模型：gpt-image-2、nano-banana-2 或 ernie-image" })),
          aspectRatio: Type.Optional(Type.String({ description: "可选宽高比，例如 auto、1:1、16:9" })),
          resolution: Type.Optional(Type.String({ description: "可选分辨率：1K、2K 或 4K" })),
        });
        const generateImageTool: AgentTool<typeof generateImageParameters> = {
          name: "generate_image",
          label: "生成图片",
          description: "根据用户需求创建一个图片生成任务。仅在用户明确要求生成、绘制、创建或修改图片时调用。",
          parameters: generateImageParameters,
          executionMode: "sequential",
          execute: async (_, args) => {
            const model = args.model && VALID_MODELS.has(args.model as ModelId) ? args.model as ModelId : defaultModel;
            const task = await createGenerationTask({
              owner: user.id,
              projectId,
              prompt: args.prompt,
              model,
              aspectRatio: args.aspectRatio || defaultAspectRatio,
              resolution: args.resolution || defaultResolution,
              referenceAssetIds,
              messageId: latestUserMessageId,
              persistUserMessage: false,
            });
            return {
              content: [{ type: "text", text: `图片生成任务已加入队列，任务 ID：${task.id}` }],
              details: { taskId: task.id, status: task.status },
            };
          },
        };
        agent = new Agent({
          initialState: {
            systemPrompt: PI_AGENT_SYSTEM_PROMPT,
            model: piAgentModel(),
            thinkingLevel: "off",
            tools: [generateImageTool],
            messages: restoredPiMessages(project.messages ?? []),
          },
          getApiKey: () => apiKey,
          toolExecution: "sequential",
          sessionId: projectId,
        });
        request.signal.addEventListener("abort", () => agent?.abort(), { once: true });
        agent.subscribe(async (event) => {
          if (event.type === "message_update") {
            if (event.assistantMessageEvent.type === "text_delta") send({ type: "message_delta", delta: event.assistantMessageEvent.delta });
            if (event.assistantMessageEvent.type === "thinking_start") send({ type: "thinking" });
          }
          if (event.type === "tool_execution_start") send({ type: "tool_start", toolName: event.toolName });
          if (event.type === "tool_execution_end") {
            send({
              type: "tool_end",
              toolName: event.toolName,
              isError: event.isError,
              details: event.result?.details,
            });
          }
          if (event.type === "message_end") {
            const piMessage = event.message as AgentMessage;
            const role = piMessage.role === "assistant" ? "agent" : piMessage.role === "toolResult" ? "system" : "user";
            const saved = await addMessage(user.id, projectId, role, messageText(piMessage), { source: "pi-agent", piMessage });
            if (piMessage.role === "user") latestUserMessageId = saved.id;
          }
        });
        await agent.prompt({ role: "user", content: prompt, timestamp: Date.now() });
        send({ type: "done" });
      } catch (error) {
        send({ type: "error", error: error instanceof Error ? error.message : "Agent 服务暂时不可用" });
      } finally {
        try {
          controller.close();
        } catch {
          // The browser may have closed the stream already.
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
