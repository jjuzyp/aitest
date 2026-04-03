import fs from "node:fs/promises";
import path from "node:path";

import type { ChatSession } from "./types.ts";

type LegacySession = Partial<ChatSession> & {
  id: string;
  createdAt: string;
  updatedAt: string;
  injectedDomains?: unknown;
};

export type SessionStore = {
  createSession: (id: string) => Promise<ChatSession>;
  getSession: (id: string) => Promise<ChatSession | undefined>;
  saveSession: (session: ChatSession) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
};

function buildNewSession(id: string): ChatSession {
  const now = new Date().toISOString();

  return {
    id,
    createdAt: now,
    updatedAt: now,
    htmlInjected: false,
    uiMessages: [],
    modelMessages: [],
  };
}

function normalizeSession(raw: LegacySession): ChatSession {
  const htmlInjected =
    typeof raw.htmlInjected === "boolean"
      ? raw.htmlInjected
      : Array.isArray(raw.injectedDomains)
        ? raw.injectedDomains.some(Boolean)
        : false;

  return {
    id: raw.id,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    htmlInjected,
    uiMessages: Array.isArray(raw.uiMessages)
      ? (raw.uiMessages as ChatSession["uiMessages"])
      : [],
    modelMessages: Array.isArray(raw.modelMessages)
      ? (raw.modelMessages as ChatSession["modelMessages"])
      : [],
  };
}

export function createSessionStore(rootDir = path.join(process.cwd(), ".sessions")): SessionStore {
  async function ensureRootDir() {
    await fs.mkdir(rootDir, { recursive: true });
  }

  function getSessionPath(id: string) {
    return path.join(rootDir, `${id}.json`);
  }

  return {
    async createSession(id: string) {
      const existing = await this.getSession(id);
      if (existing) {
        return existing;
      }

      const session = buildNewSession(id);
      await this.saveSession(session);
      return session;
    },
    async getSession(id: string) {
      try {
        const raw = await fs.readFile(getSessionPath(id), "utf8");
        return normalizeSession(JSON.parse(raw) as LegacySession);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          return undefined;
        }
        throw error;
      }
    },
    async saveSession(session: ChatSession) {
      await ensureRootDir();
      await fs.writeFile(
        getSessionPath(session.id),
        JSON.stringify(session, null, 2),
        "utf8",
      );
    },
    async deleteSession(id: string) {
      try {
        await fs.unlink(getSessionPath(id));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          return;
        }
        throw error;
      }
    },
  };
}
