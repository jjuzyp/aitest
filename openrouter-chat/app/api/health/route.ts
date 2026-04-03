import { readConfig } from "../../../lib/config";

export const runtime = "nodejs";

export async function GET() {
  const config = readConfig();

  return Response.json({
    ok: true,
    model: config.OPENROUTER_MODEL,
    sessionsDir: config.SESSIONS_DIR,
    dashboardHtmlPath: config.DASHBOARD_HTML_PATH,
  });
}
