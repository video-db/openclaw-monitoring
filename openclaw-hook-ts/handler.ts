import { connect, type Connection } from "videodb";
import type { RTStream } from "videodb";

interface VideoDBConfig {
  apiKey?: string;
  captureSessionId?: string;
  minClipDuration?: number;
  maxClipDuration?: number;
  clipBuffer?: number;
}

interface OpenClawConfig {
  entries?: {
    videodb?: VideoDBConfig;
  };
}

interface PendingMessage {
  channelId: string;
  accountId?: string;
  conversationId: string;
  threadId?: string;
  from: string;
  startTime: number;
}

interface HookEvent {
  type: "message";
  action: "received" | "sent";
  sessionKey: string;
  timestamp: Date;
  messages: string[];
  context: {
    from?: string;
    to?: string;
    content?: string;
    success?: boolean;
    channelId: string;
    accountId?: string;
    conversationId?: string;
    metadata?: { threadId?: string };
    cfg?: OpenClawConfig;
  };
}

const REPLAY_MARKER = "[screen-replay]";
const PENDING_TTL_MS = 10 * 60 * 1000;

const pending = new Map<string, PendingMessage>();
let conn: Connection | null = null;
let stream: RTStream | null = null;
let activeSessionId: string | null = null;

function cfg(event: HookEvent): VideoDBConfig {
  return event.context.cfg?.entries?.videodb || {};
}

function correlationKey(
  channelId: string,
  accountId: string | undefined,
  conversationId: string,
  threadId?: string
): string {
  return [channelId, accountId || "_", conversationId, threadId || "_"].join(":");
}

async function initStream(config: VideoDBConfig): Promise<void> {
  const apiKey = config.apiKey || process.env.VIDEODB_API_KEY;
  const sessionId = config.captureSessionId || process.env.VIDEODB_CAPTURE_SESSION_ID;

  if (!apiKey || !sessionId) return;

  if (activeSessionId && activeSessionId !== sessionId) {
    conn = null;
    stream = null;
  }

  if (stream && activeSessionId === sessionId) return;

  try {
    conn = connect(apiKey);
    const coll = await conn.getCollection();
    const session = await coll.getCaptureSession(sessionId);
    await session.refresh();

    const screens = session.getRTStream("screen");
    if (screens.length > 0) {
      stream = screens[0];
      activeSessionId = sessionId;
    }
  } catch (err) {
    console.error("[videodb-replay] init failed:", err);
  }
}

async function generateClip(
  startTime: number,
  endTime: number,
  config: VideoDBConfig
): Promise<string | null> {
  await initStream(config);
  if (!stream) return null;

  try {
    const buffer = config.clipBuffer ?? 1;
    return await stream.generateStream(
      Math.floor(startTime - buffer),
      Math.floor(endTime + buffer)
    );
  } catch (err) {
    console.error("[videodb-replay] clip failed:", err);
    return null;
  }
}

const handler = async (event: HookEvent): Promise<void> => {
  if (event.type !== "message") return;

  const content = event.context.content || "";
  if (content.includes(REPLAY_MARKER)) return;

  const { action, context } = event;
  const channelId = context.channelId;
  const accountId = context.accountId;
  const conversationId = context.conversationId || context.from || "unknown";
  const now = Date.now() / 1000;

  if (action === "received") {
    const threadId = context.metadata?.threadId;
    const key = correlationKey(channelId, accountId, conversationId, threadId);

    // Clean stale
    for (const [k, p] of pending.entries()) {
      if (now - p.startTime > PENDING_TTL_MS / 1000) pending.delete(k);
    }

    pending.set(key, {
      channelId,
      accountId,
      conversationId,
      threadId,
      from: context.from || "",
      startTime: now,
    });
    return;
  }

  if (action === "sent") {
    if (context.success === false) return;

    const key = correlationKey(channelId, accountId, conversationId, undefined);
    let match = pending.get(key);

    if (!match) {
      for (const [k, p] of pending.entries()) {
        if (p.channelId === channelId && p.accountId === accountId && p.conversationId === conversationId) {
          match = p;
          pending.delete(k);
          break;
        }
      }
    } else {
      pending.delete(key);
    }

    if (!match) return;

    const config = cfg(event);
    const duration = now - match.startTime;
    const minDuration = config.minClipDuration ?? 2;
    const maxDuration = config.maxClipDuration ?? 300;

    if (duration < minDuration || duration > maxDuration) return;

    const url = await generateClip(match.startTime, now, config);
    if (url) {
      event.messages.push(`${REPLAY_MARKER} Screen recording (${Math.floor(duration)}s): ${url}`);
    }
  }
};

export default handler;
