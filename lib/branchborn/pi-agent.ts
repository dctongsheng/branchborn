import type { AgentMessage } from "@earendil-works/pi-agent-core";
import type { Model } from "@earendil-works/pi-ai";
import type { Message } from "@/lib/branchborn/types";
import { tokendanceApiBase, tokendanceApiKey } from "@/lib/branchborn/tokendance";

export const PI_AGENT_SYSTEM_PROMPT = `你是 Branchborn Canvas 的设计 Agent。
你可以与用户讨论视觉创意、优化提示词，也可以在用户明确要求生成图片时调用 generate_image。
只有用户希望生成、绘制、创建或修改图片时才调用工具。普通咨询、创意讨论和提示词优化不要调用工具。
调用工具后，用简短中文告诉用户任务已加入队列，生成完成后会自动添加到画布。
不要声称你已经看到尚未生成的图片。`;

export function piAgentModel(): Model<"openai-completions"> {
  return {
    id: process.env.PI_AGENT_MODEL || "deepseek-v4-flash",
    name: "DeepSeek V4 Flash",
    api: "openai-completions",
    provider: "tokendance",
    baseUrl: tokendanceApiBase(),
    reasoning: false,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 128000,
    maxTokens: 8192,
    compat: {
      supportsStore: false,
      supportsDeveloperRole: false,
      supportsReasoningEffort: false,
    },
  };
}

export function piAgentApiKey() {
  const key = tokendanceApiKey();
  if (!key || key.includes("your-")) throw new Error("尚未配置 TOKENDANCE_API_KEY");
  return key;
}

export function messageText(message: AgentMessage) {
  if (message.role === "user") {
    return typeof message.content === "string"
      ? message.content
      : message.content.filter((item) => item.type === "text").map((item) => item.text).join("");
  }
  if (message.role === "assistant" || message.role === "toolResult") {
    return message.content.filter((item) => item.type === "text").map((item) => item.text).join("");
  }
  return "";
}

export function restoredPiMessages(messages: Message[]) {
  return messages
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((message) => message.metadata.piMessage)
    .filter((message): message is AgentMessage => Boolean(message && typeof message === "object" && "role" in message));
}
