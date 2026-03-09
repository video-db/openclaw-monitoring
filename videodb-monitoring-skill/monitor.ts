#!/usr/bin/env npx tsx
import { connect, CaptureClient } from "videodb";
import { execSync, spawn, type ChildProcess } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const OPENCLAW_CONFIG_PATH = path.join(os.homedir(), ".openclaw", "openclaw.json");
const LOG_DIR = path.join(os.homedir(), ".videodb", "logs");
const LOG_FILE = path.join(LOG_DIR, "monitor.log");
const SKILL_CONFIG_BASE = "skills.entries.videodb-monitoring";

let cleanupDone = false;

function log(message: string): void {
  const timestamp = new Date().toISOString();
  const line = `${timestamp} ${message}\n`;
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    fs.appendFileSync(LOG_FILE, line);
  } catch {
    // ignore
  }
  console.log(`[${timestamp}] ${message}`);
}

interface OpenClawConfig {
  skills?: {
    entries?: {
      "videodb-monitoring"?: {
        enabled?: boolean;
        apiKey?: string;
        env?: {
          VIDEODB_API_KEY?: string;
          VIDEODB_IS_RUNNING?: string;
          VIDEODB_CAPTURE_SESSION_ID?: string;
          VIDEODB_MONITOR_PID?: string;
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
  // Check environment variables first
  if (process.env.VIDEODB_API_KEY) return process.env.VIDEODB_API_KEY;
  if (process.env.VIDEO_DB_API_KEY) return process.env.VIDEO_DB_API_KEY;

  // Then check skills config
  const config = readOpenClawConfig();
  const skillConfig = config.skills?.entries?.["videodb-monitoring"];
  return (
    skillConfig?.env?.VIDEODB_API_KEY ||
    (typeof skillConfig?.apiKey === "string" ? skillConfig.apiKey : undefined)
  );
}

function setSkillEnv(key: string, value: string): void {
  const configPath = `${SKILL_CONFIG_BASE}.env.${key}`;
  try {
    execSync(`openclaw config set ${configPath} '${value}'`, {
      timeout: 10000,
      stdio: "pipe",
    });
    log(`Config set: env.${key} = ${value}`);
  } catch (e: any) {
    log(`[warning] Could not set env.${key}: ${e.message}`);
  }
}

function clearSkillState(): void {
  if (cleanupDone) return;
  cleanupDone = true;

  log("Clearing skill state...");
  try {
    execSync(`openclaw config set ${SKILL_CONFIG_BASE}.env.VIDEODB_IS_RUNNING 'false'`, {
      timeout: 10000,
      stdio: "pipe",
    });
  } catch {
    // ignore - best effort
  }
  try {
    execSync(`openclaw config set ${SKILL_CONFIG_BASE}.env.VIDEODB_CAPTURE_SESSION_ID ''`, {
      timeout: 10000,
      stdio: "pipe",
    });
  } catch {
    // ignore - best effort
  }
  try {
    execSync(`openclaw config set ${SKILL_CONFIG_BASE}.env.VIDEODB_MONITOR_PID ''`, {
      timeout: 10000,
      stdio: "pipe",
    });
  } catch {
    // ignore - best effort
  }
  log("Skill state cleared");
}

async function createSession(apiKey: string) {
  const conn = connect(apiKey);
  const session = await conn.createCaptureSession({
    endUserId: "openclaw-monitor",
    metadata: { app: "openclaw-monitoring" },
  });
  const token = await conn.generateClientToken();
  return { sessionId: session.id, token, conn };
}

const DEFAULT_VISUAL_PROMPT =
  "Describe the screen: " +
  "(1) Active application and current activity. " +
  "(2) Browser status - is one open? What URL/page? " +
  "(3) Any error dialogs, crashes, or warning messages? " +
  "(4) Timestamp if a clock is visible.";

function parseArgs(): { visualPrompt: string } {
  const args = process.argv.slice(2);
  let visualPrompt = DEFAULT_VISUAL_PROMPT;

  const idx = args.indexOf("--visual-prompt");
  if (idx !== -1 && args[idx + 1]) {
    visualPrompt = args[idx + 1];
  }

  return { visualPrompt };
}

const cliArgs = parseArgs();

async function startIndexing(apiKey: string, sessionId: string) {
  log("waiting for session to become active before starting indexing...");

  await new Promise((r) => setTimeout(r, 5000));

  const conn = connect(apiKey);
  const coll = await conn.getCollection();
  const session = await coll.getCaptureSession(sessionId);
  await session.refresh();

  const screens = session.getRTStream("screen");
  const audios = session.getRTStream("system_audio");

  log(`found ${screens.length} screen stream(s), ${audios.length} audio stream(s)`);

  if (screens.length > 0) {
    const screen = screens[0];
    try {
      await screen.indexVisuals({
        prompt: cliArgs.visualPrompt,
        batchConfig: { type: "time", value: 5, frameCount: 1 },
      });
      log("visual indexing started");
    } catch (err: any) {
      log(`visual indexing failed: ${err.message}`);
    }
  }

  if (audios.length > 0) {
    const audio = audios[0];
    try {
      await audio.startTranscript();
      log("transcription started");
    } catch (err: any) {
      log(`transcription failed: ${err.message}`);
    }

    try {
      await audio.indexAudio({
        prompt: "Summarize the audio content.",
        batchConfig: { type: "time", value: 30 },
      });
      log("audio indexing started");
    } catch (err: any) {
      log(`audio indexing failed: ${err.message}`);
    }
  }
}

async function capture(token: string, sessionId: string): Promise<never> {
  log("initializing capture client");
  const client = new CaptureClient({ sessionToken: token });

  let caffeinate: ChildProcess | null = null;
  if (process.platform === "darwin") {
    caffeinate = spawn("caffeinate", ["-dims"], { stdio: "ignore", detached: true });
    caffeinate.unref();
  }

  const shutdown = async () => {
    log("shutdown requested");
    clearSkillState();
    await client.stopSession().catch((e) => log(`stopSession error: ${e.message}`));
    await client.shutdown().catch((e) => log(`shutdown error: ${e.message}`));
    caffeinate?.kill();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  process.on("SIGHUP", () => log("received SIGHUP, ignoring"));
  process.on("uncaughtException", (err) => {
    log(`uncaughtException: ${err.message}`);
    clearSkillState();
    process.exit(1);
  });
  process.on("unhandledRejection", (reason: any) => {
    log(`unhandledRejection: ${reason?.message || reason}`);
    clearSkillState();
    process.exit(1);
  });

  // Request screen capture permission (required)
  log("requesting screen-capture permission");
  try {
    await client.requestPermission("screen-capture");
    log("screen-capture permission granted");
  } catch (err: any) {
    log(`screen-capture permission failed: ${err.message}`);
    throw err;
  }

  // Request microphone permission (optional - continue without if denied)
  let hasAudioPermission = false;
  log("requesting microphone permission");
  try {
    await client.requestPermission("microphone");
    hasAudioPermission = true;
    log("microphone permission granted");
  } catch (err: any) {
    log(`microphone permission denied: ${err.message} - continuing without audio`);
  }

  const channels = await client.listChannels();
  const display = channels.displays.default;
  const systemAudio = hasAudioPermission ? channels.systemAudio.default : null;

  if (!display) {
    log("no display found");
    throw new Error("No display found");
  }

  const selected: { channelId: string; type: "video" | "audio"; store: boolean }[] = [];

  if (display) {
    selected.push({ channelId: display.id, type: "video", store: true });
  }
  if (systemAudio) {
    selected.push({ channelId: systemAudio.id, type: "audio", store: true });
  }

  log(`recording ${selected.length} channel(s)`);
  selected.forEach((ch) => log(`  - ${ch.type}: ${ch.channelId}`));

  await client.startSession({ sessionId, channels: selected as any });

  log("recording started");

  const apiKey = getApiKey();
  if (apiKey) {
    startIndexing(apiKey, sessionId).catch((err) => {
      log(`indexing setup failed: ${err.message}`);
    });
  }

  return new Promise(() => {});
}

async function main() {
  log("VideoDB Screen Monitor starting");

  const apiKey = getApiKey();
  if (!apiKey) {
    log("API key not found");
    console.error("API key not found. Set it via:");
    console.error(`  openclaw config set ${SKILL_CONFIG_BASE}.env.VIDEODB_API_KEY 'sk-xxx'`);
    process.exit(1);
  }

  log(`API key: ${apiKey.slice(0, 10)}...`);

  // Set running state immediately
  setSkillEnv("VIDEODB_IS_RUNNING", "true");
  setSkillEnv("VIDEODB_MONITOR_PID", String(process.pid));

  const { sessionId, token } = await createSession(apiKey);
  log(`session created: ${sessionId}`);

  setSkillEnv("VIDEODB_CAPTURE_SESSION_ID", sessionId);

  await capture(token, sessionId);
}

main().catch((err) => {
  log(`fatal error: ${err.message}`);
  clearSkillState();
  console.error(err.message);
  process.exit(1);
});
