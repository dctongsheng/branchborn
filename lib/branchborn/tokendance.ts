const DEFAULT_TOKENDANCE_API_BASE = "https://tokendance.space/gateway/v1";

export function tokendanceApiBase() {
  return process.env.TOKENDANCE_API_BASE_URL || process.env.ERNIE_IMAGE_API_BASE_URL || DEFAULT_TOKENDANCE_API_BASE;
}

export function tokendanceApiKey() {
  return process.env.TOKENDANCE_API_KEY || process.env.ERNIE_IMAGE_API_KEY;
}

export function isTokendanceConfigured() {
  const key = tokendanceApiKey();
  return Boolean(key && !key.includes("your-"));
}
