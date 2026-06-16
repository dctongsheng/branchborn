const REQUIRED_PRODUCTION_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "IMAGE_API_KEY",
  "TOKENDANCE_API_KEY",
  "IMAGE_API_WEBHOOK_HMAC_KEY",
  "APP_URL",
] as const;

function hasRealValue(name: string) {
  const value = process.env[name];
  return Boolean(value && value.trim() && !value.includes("your-"));
}

export function isDockerProduction() {
  return process.env.NODE_ENV === "production" && process.env.BRANCHBORN_DEPLOY_TARGET === "docker";
}

export function missingProductionEnv() {
  if (!isDockerProduction()) return [];
  return REQUIRED_PRODUCTION_ENV.filter((name) => !hasRealValue(name));
}

export function assertProductionReady() {
  const missing = missingProductionEnv();
  if (missing.length) {
    throw new Error(`生产环境缺少必需配置：${missing.join(", ")}`);
  }
}
