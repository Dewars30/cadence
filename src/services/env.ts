type EnvRecord = Record<string, string | undefined>;

function readViteEnv(): EnvRecord | undefined {
  return (import.meta as unknown as { env?: EnvRecord }).env;
}

function readNodeEnv(): EnvRecord | undefined {
  return (globalThis as unknown as { process?: { env?: EnvRecord } }).process?.env;
}

export function readEnv(key: string): string | undefined {
  // Vite / browser
  const viteVal = readViteEnv()?.[key];
  if (typeof viteVal === "string" && viteVal.length > 0) return viteVal;

  // Node / Vitest
  const nodeVal = readNodeEnv()?.[key];
  if (typeof nodeVal === "string" && nodeVal.length > 0) return nodeVal;

  return undefined;
}

export function requireEnv(key: string): string {
  const v = readEnv(key);
  if (!v) throw new Error(`Missing required env var: ${key}`);
  return v;
}

export function readEnvWithDefault(key: string, fallback: string): string {
  return readEnv(key) ?? fallback;
}
