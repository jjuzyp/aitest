import crypto from "node:crypto";
import fs from "node:fs/promises";

import { readConfig } from "../../../lib/config";
import { createSessionStore } from "../../../lib/session-store";

export const runtime = "nodejs";

export async function POST() {
  try {
    const config = readConfig();
    await fs.access(config.DASHBOARD_HTML_PATH);

    const store = createSessionStore(config.SESSIONS_DIR);
    const session = await store.createSession(crypto.randomUUID());

    return Response.json({
      sessionId: session.id,
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create chat session",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { sessionId?: unknown };
    const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";

    if (!sessionId) {
      return Response.json({ error: "sessionId is required" }, { status: 400 });
    }

    const config = readConfig();
    const store = createSessionStore(config.SESSIONS_DIR);
    await store.deleteSession(sessionId);

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete chat session",
      },
      { status: 500 },
    );
  }
}
