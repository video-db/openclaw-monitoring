#!/usr/bin/env npx tsx
import { connect, CaptureClient } from "videodb";
import { execSync, spawn, type ChildProcess } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const OPENCLAW_CONFIG_PATH = path.join(os.homedir(), ".openclaw", "openclaw.json");

interface OpenClawConfig {
  hooks?: {
    internal?: {
      entries?: {
        videodb?: {
          apiKey?: string;
          captureSessionId?: string;
        };
      };
    };
  };
}

function readOpenClawConfig(): OpenClawConfig {
  try {
    if (fs.existsSync(OPENCLAW_CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(OPENCLAW_CONFIG_PATH, "utf-8"));
    }
  } catch {
    // ignore
  }
  return {};
}

function getApiKey(): string | undefined {
  const config = readOpenClawConfig();
  return (
    config.hooks?.internal?.entries?.videodb?.apiKey ||
    process.env.VIDEODB_API_KEY ||
    process.env.VIDEO_DB_API_KEY
  );
}

function updateSessionId(sessionId: string): void {
  const configPath = "hooks.internal.entries.videodb.captureSessionId";
  try {
    execSync(`openclaw config set ${configPath} '${sessionId}'`, {
      timeout: 10000,
      stdio: "pipe",
    });
    console.log(`  Config updated: ${configPath}`);
  } catch {
    console.log(`  [warning] Could not update config. Set manually:`);
    console.log(`    openclaw config set ${configPath} '${sessionId}'`);
  }
}

async function createSession(apiKey: string) {
  const conn = connect(apiKey);
  const session = await conn.createCaptureSession({
    endUserId: "openclaw-monitor",
    metadata: { app: "openclaw-monitoring" },
  });
  const token = await conn.generateClientToken();
  return { sessionId: session.id, token };
}

async function capture(token: string, sessionId: string): Promise<never> {
  const client = new CaptureClient({ sessionToken: token });

  let caffeinate: ChildProcess | null = null;
  if (process.platform === "darwin") {
    caffeinate = spawn("caffeinate", ["-dims"], { stdio: "ignore" });
  }

  const shutdown = async () => {
    console.log("\nShutting down...");
    await client.stopSession().catch(() => {});
    await client.shutdown().catch(() => {});
    caffeinate?.kill();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  await client.requestPermission("screen-capture");
  await client.requestPermission("microphone");

  const channels = await client.listChannels();
  const display = channels.displays.default;
  const systemAudio = channels.systemAudio.default;

  if (!display) {
    console.error("No display found");
    process.exit(1);
  }

  const selected = [
    display && { channelId: display.id, type: "video" as const, store: true },
    systemAudio && { channelId: systemAudio.id, type: "audio" as const, store: true },
  ].filter(Boolean);

  console.log(`\nRecording ${selected.length} channel(s):`);
  selected.forEach((ch) => console.log(`  - ${ch!.type}: ${ch!.channelId}`));

  await client.startSession({ sessionId, channels: selected as any });

  console.log("\nRecording... (Ctrl+C to stop)\n");

  return new Promise(() => {});
}

async function main() {
  console.log("VideoDB Screen Monitor\n");

  const apiKey = getApiKey();
  if (!apiKey) {
    console.error("API key not found. Set it via:");
    console.error("  openclaw config set hooks.internal.entries.videodb.apiKey 'sk-xxx'");
    process.exit(1);
  }

  console.log(`API key: ${apiKey.slice(0, 10)}...`);

  const { sessionId, token } = await createSession(apiKey);
  console.log(`Session: ${sessionId}`);

  updateSessionId(sessionId);

  await capture(token, sessionId);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
