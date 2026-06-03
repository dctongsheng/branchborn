export type ModelId = "gpt-image-2" | "nano-banana-2" | "ernie-image";
export type TaskStatus = "queued" | "processing" | "succeeded" | "failed";
export type AssetType = "reference_image" | "uploaded_image" | "generated_image";

export interface Asset {
  id: string;
  project_id: string;
  asset_type: AssetType;
  storage_path: string;
  mime_type: string;
  file_size: number;
  created_at: string;
  url?: string;
}

export interface CanvasNodeRecord {
  id: string;
  project_id: string;
  node_type: "generated_image" | "uploaded_image";
  position: { x: number; y: number };
  size: { width: number; height: number };
  asset_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  asset?: Asset;
}

export interface Message {
  id: string;
  project_id: string;
  role: "user" | "agent" | "system";
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface GenerationTask {
  id: string;
  project_id: string;
  message_id?: string;
  provider: "kie.ai" | "tokendance" | "demo";
  model: string;
  task_type: "text_to_image" | "image_to_image";
  provider_task_id?: string;
  status: TaskStatus;
  prompt: string;
  parameters: {
    model: ModelId;
    aspectRatio: string;
    resolution: string;
    referenceAssetIds?: string[];
  };
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  user_id?: string | null;
  guest_session_hash?: string | null;
  name: string;
  cover_asset_id?: string;
  viewport: { x: number; y: number; zoom: number };
  created_at: string;
  updated_at: string;
  cover?: Asset;
  assets?: Asset[];
  messages?: Message[];
  canvas_nodes?: CanvasNodeRecord[];
  generation_tasks?: GenerationTask[];
}

export interface Store {
  projects: Project[];
  messages: Message[];
  canvas_nodes: CanvasNodeRecord[];
  generation_tasks: GenerationTask[];
  assets: Asset[];
}
