import fs from "node:fs";
import path from "node:path";

export type AppConfig = {
  OPENROUTER_API_KEY: string;
  OPENROUTER_MODEL: string;
  OPENROUTER_SITE_URL: string;
  OPENROUTER_SITE_NAME: string;
  PORT: number;
  SESSIONS_DIR: string;
  DASHBOARD_HTML_PATH: string;
  WORKSPACE_ROOT: string;
};

function parseEnvFile(content: string): Record<string, string> {
  const entries: Record<string, string> = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const eqIndex = line.indexOf("=");
    if (eqIndex <= 0) {
      continue;
    }

    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();

    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    entries[key] = value;
  }

  return entries;
}

function loadEnvFiles(cwd: string): Record<string, string> {
  const workspaceRoot = path.resolve(cwd, "..");
  const candidates = [
    path.join(workspaceRoot, ".env"),
    path.join(workspaceRoot, ".env.local"),
    path.join(cwd, ".env"),
    path.join(cwd, ".env.local"),
  ];

  const merged: Record<string, string> = {};
  for (const filePath of candidates) {
    try {
      Object.assign(merged, parseEnvFile(fs.readFileSync(filePath, "utf8")));
    } catch {
      // Ignore missing env files.
    }
  }

  return merged;
}

export function readConfig(
  env: Partial<Record<string, string | undefined>> = process.env,
): AppConfig {
  const cwd = process.cwd();
  const workspaceRoot = path.resolve(cwd, "..");
  const mergedEnv = {
    ...loadEnvFiles(cwd),
    ...env,
  };

  const openrouterApiKey = mergedEnv.OPENROUTER_API_KEY?.trim();
  if (!openrouterApiKey) {
    throw new Error("OPENROUTER_API_KEY is required");
  }

  const port = Number.parseInt(mergedEnv.PORT?.trim() || "8012", 10);

  return {
    OPENROUTER_API_KEY: openrouterApiKey,
    OPENROUTER_MODEL:
      mergedEnv.OPENROUTER_MODEL?.trim() || "qwen/qwen3.6-plus:free",
    OPENROUTER_SITE_URL:
      mergedEnv.OPENROUTER_SITE_URL?.trim() || "http://localhost:8012",
    OPENROUTER_SITE_NAME:
      mergedEnv.OPENROUTER_SITE_NAME?.trim() || "WB Dashboard Chat",
    PORT: Number.isFinite(port) ? port : 8012,
    SESSIONS_DIR:
      mergedEnv.SESSIONS_DIR?.trim() || path.join(cwd, ".sessions"),
    DASHBOARD_HTML_PATH:
      mergedEnv.DASHBOARD_HTML_PATH?.trim() ||
      path.join(workspaceRoot, "HTMLDASH", "WB Dashboard.html"),
    WORKSPACE_ROOT: workspaceRoot,
  };
}
