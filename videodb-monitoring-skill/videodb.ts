#!/usr/bin/env npx tsx
import { connect } from "videodb";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const CONFIG_PATH = path.join(os.homedir(), ".openclaw", "openclaw.json");
const LOG_DIR = path.join(os.homedir(), ".videodb", "logs");
const LOG_FILE = path.join(LOG_DIR, "skill.log");
const SKILL_NAME = "videodb-monitoring";
const SKILL_CONFIG_PATH = `skills.entries.${SKILL_NAME}`;
const VISUAL_INDEX_NAME = "openclaw-visual-index";
const AUDIO_INDEX_NAME = "openclaw-audio-index";
const DEFAULT_VISUAL_PROMPT =
  "Describe the screen: " +
  "(1) Active application and current activity. " +
  "(2) Browser status - is one open? What URL/page? " +
  "(3) Any error dialogs, crashes, or warning messages? " +
  "(4) Timestamp if a clock is visible.";
const DEFAULT_AUDIO_PROMPT = "Summarize the audio content.";

function log(message: string): void {
  const timestamp = new Date().toISOString();
  const line = `${timestamp} ${message}\n`;
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    fs.appendFileSync(LOG_FILE, line);
  } catch {
    // ignore
  }
}

interface SkillConfig {
  enabled?: boolean;
  apiKey?: string;
  env?: {
    VIDEODB_API_KEY?: string;
    VIDEODB_IS_RUNNING?: string;
    VIDEODB_CAPTURE_SESSION_ID?: string;
    VIDEODB_MONITOR_PID?: string;
  };
}

interface Config {
  skills?: {
    entries?: {
      "videodb-monitoring"?: SkillConfig;
    };
  };
}

function loadConfig(): { apiKey: string; sessionId: string } {
  // Check environment variables first
  let apiKey = process.env.VIDEODB_API_KEY || process.env.VIDEO_DB_API_KEY;
  let sessionId = process.env.VIDEODB_CAPTURE_SESSION_ID;
  let isRunning = false;

  try {
    const config: Config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
    const skillConfig = config.skills?.entries?.["videodb-monitoring"];
    const env = skillConfig?.env;

    if (!apiKey) {
      apiKey = env?.VIDEODB_API_KEY ||
               (typeof skillConfig?.apiKey === "string" ? skillConfig.apiKey : undefined);
    }
    sessionId = sessionId || env?.VIDEODB_CAPTURE_SESSION_ID;
    isRunning = env?.VIDEODB_IS_RUNNING === "true";
  } catch {
    // ignore
  }

  if (!apiKey) {
    console.error("ERROR: VideoDB API key not found.\n");
    console.error("Please set your API key using one of these methods:\n");
    console.error("1. Set it in OpenClaw config:");
    console.error(`   openclaw config set ${SKILL_CONFIG_PATH}.env.VIDEODB_API_KEY 'sk-xxx'\n`);
    console.error("2. Or provide it to the agent and it will set it for you.\n");
    console.error("Get your API key at: https://console.videodb.io");
    process.exit(1);
  }

  if (!sessionId) {
    console.error("ERROR: No capture session found.\n");
    if (!isRunning) {
      console.error("The screen monitor is not running. Start it with:\n");
      console.error("   cd ~/.openclaw/workspace/skills/videodb-monitoring");
      console.error("   nohup npx tsx monitor.ts > ~/.videodb/logs/monitor.log 2>&1 &");
      console.error("   disown\n");
    } else {
      console.error("Monitor shows as running but no session ID found.");
      console.error("Try restarting the monitor.\n");
    }
    process.exit(1);
  }

  return { apiKey, sessionId };
}

function parseFlagValue(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : undefined;
}

function isStoppedStatus(status?: string): boolean {
  return status === "stopped" || status === "stop_requested" || status === "stopping";
}

async function loadSession() {
  const { apiKey, sessionId } = loadConfig();
  const conn = connect(apiKey);
  const coll = await conn.getCollection();
  const session = await coll.getCaptureSession(sessionId);
  await session.refresh();

  return { apiKey, sessionId, conn, coll, session };
}

function getManagedIndexes(
  indexes: Array<{
    name?: string;
    extractionType?: string;
    status?: string;
    rtstreamIndexId: string;
    start: () => Promise<void>;
    stop: () => Promise<void>;
    getScenes?: (
      start?: number,
      end?: number,
      page?: number,
      pageSize?: number
    ) => Promise<{ scenes: unknown[]; nextPage: boolean } | null>;
  }>,
  kind: "visual" | "audio"
) {
  const preferredName = kind === "visual" ? VISUAL_INDEX_NAME : AUDIO_INDEX_NAME;
  const namedIndexes = indexes.filter((index) => index.name === preferredName);
  if (namedIndexes.length > 0) return namedIndexes;

  return indexes.filter((index) =>
    kind === "visual" ? index.extractionType !== "transcript" : index.extractionType === "transcript"
  );
}

async function startVisualIndex(prompt: string = DEFAULT_VISUAL_PROMPT) {
  log(`startVisualIndex: prompt="${prompt}"`);
  const { session } = await loadSession();
  const screens = session.getRTStream("screen");
  if (screens.length === 0) {
    console.log("No screen stream found");
    return;
  }

  const screen = screens[0];
  const indexes = getManagedIndexes(await screen.listSceneIndexes(), "visual");
  const runningIndex = indexes.find((index) => !isStoppedStatus(index.status));
  if (runningIndex) {
    console.log(`Visual indexing already running (${runningIndex.rtstreamIndexId})`);
    return;
  }

  const stoppedIndex = indexes[0];
  if (stoppedIndex) {
    await stoppedIndex.start();
    log(`startVisualIndex: restarted ${stoppedIndex.rtstreamIndexId}`);
    console.log(`Started visual indexing (${stoppedIndex.rtstreamIndexId})`);
    return;
  }

  const created = await screen.indexVisuals({
    name: VISUAL_INDEX_NAME,
    prompt,
    batchConfig: { type: "time", value: 5, frameCount: 1 },
  });

  if (!created) {
    console.log("Could not create visual index");
    return;
  }

  log(`startVisualIndex: created ${created.rtstreamIndexId}`);
  console.log(`Started visual indexing (${created.rtstreamIndexId})`);
}

async function stopVisualIndex() {
  log("stopVisualIndex");
  const { session } = await loadSession();
  const screens = session.getRTStream("screen");
  if (screens.length === 0) {
    console.log("No screen stream found");
    return;
  }

  const screen = screens[0];
  const indexes = getManagedIndexes(await screen.listSceneIndexes(), "visual");
  const runningIndexes = indexes.filter((index) => !isStoppedStatus(index.status));
  if (runningIndexes.length === 0) {
    console.log("No active visual index found");
    return;
  }

  for (const index of runningIndexes) {
    await index.stop();
    log(`stopVisualIndex: stopped ${index.rtstreamIndexId}`);
  }

  console.log(`Stopped ${runningIndexes.length} visual index(es)`);
}

async function startTranscript(engine: string = "assemblyai") {
  log(`startTranscript: engine=${engine}`);
  const { session } = await loadSession();
  const audios = session.getRTStream("system_audio");
  if (audios.length === 0) {
    console.log("No audio stream found");
    return;
  }

  await audios[0].startTranscript(undefined, engine);
  console.log(`Started transcript (${engine})`);
}

async function stopTranscript(engine: string = "assemblyai", mode: "graceful" | "force" = "graceful") {
  log(`stopTranscript: engine=${engine} mode=${mode}`);
  const { session } = await loadSession();
  const audios = session.getRTStream("system_audio");
  if (audios.length === 0) {
    console.log("No audio stream found");
    return;
  }

  await audios[0].stopTranscript(mode, engine);
  console.log(`Stopped transcript (${engine}, ${mode})`);
}

async function startAudioIndex(prompt: string = DEFAULT_AUDIO_PROMPT) {
  log(`startAudioIndex: prompt="${prompt}"`);
  const { session } = await loadSession();
  const audios = session.getRTStream("system_audio");
  if (audios.length === 0) {
    console.log("No audio stream found");
    return;
  }

  const audio = audios[0];
  const indexes = getManagedIndexes(await audio.listSceneIndexes(), "audio");
  const runningIndex = indexes.find((index) => !isStoppedStatus(index.status));
  if (runningIndex) {
    console.log(`Audio indexing already running (${runningIndex.rtstreamIndexId})`);
    return;
  }

  const stoppedIndex = indexes[0];
  if (stoppedIndex) {
    await stoppedIndex.start();
    log(`startAudioIndex: restarted ${stoppedIndex.rtstreamIndexId}`);
    console.log(`Started audio indexing (${stoppedIndex.rtstreamIndexId})`);
    return;
  }

  const created = await audio.indexAudio({
    name: AUDIO_INDEX_NAME,
    prompt,
    batchConfig: { type: "time", value: 30 },
    autoStartTranscript: false,
  });

  if (!created) {
    console.log("Could not create audio index. Start transcript first with `videodb start-transcript`.");
    return;
  }

  log(`startAudioIndex: created ${created.rtstreamIndexId}`);
  console.log(`Started audio indexing (${created.rtstreamIndexId})`);
}

async function stopAudioIndex() {
  log("stopAudioIndex");
  const { session } = await loadSession();
  const audios = session.getRTStream("system_audio");
  if (audios.length === 0) {
    console.log("No audio stream found");
    return;
  }

  const audio = audios[0];
  const indexes = getManagedIndexes(await audio.listSceneIndexes(), "audio");
  const runningIndexes = indexes.filter((index) => !isStoppedStatus(index.status));
  if (runningIndexes.length === 0) {
    console.log("No active audio index found");
    return;
  }

  for (const index of runningIndexes) {
    await index.stop();
    log(`stopAudioIndex: stopped ${index.rtstreamIndexId}`);
  }

  console.log(`Stopped ${runningIndexes.length} audio index(es)`);
}

async function startIndexing(args: string[]) {
  const visualPrompt = parseFlagValue(args, "--visual-prompt") || DEFAULT_VISUAL_PROMPT;
  const audioPrompt = parseFlagValue(args, "--audio-prompt") || DEFAULT_AUDIO_PROMPT;
  const engine = parseFlagValue(args, "--engine") || "assemblyai";

  await startTranscript(engine);
  await startAudioIndex(audioPrompt);
  await startVisualIndex(visualPrompt);
}

async function stopIndexing(args: string[]) {
  const engine = parseFlagValue(args, "--engine") || "assemblyai";
  const mode = parseFlagValue(args, "--mode") === "force" ? "force" : "graceful";

  await stopVisualIndex();
  await stopAudioIndex();
  await stopTranscript(engine, mode);
}

async function search(query: string) {
  log(`search: query="${query}"`);
  const { session } = await loadSession();

  const screens = session.getRTStream("screen");
  if (screens.length === 0) {
    log("search: no screen stream found");
    console.log("No screen stream found");
    return;
  }

  const screen = screens[0];
  const indexes = getManagedIndexes(await screen.listSceneIndexes(), "visual");
  if (indexes.length === 0) {
    console.log("No visual index found. Start one with `videodb start-visual-index`.");
    return;
  }

  const results = await screen.search({ query, resultThreshold: 5 });
  const shots = results.getShots();

  log(`search: found ${shots.length} results`);

  if (shots.length === 0) {
    console.log(`No results for "${query}"`);
    return;
  }

  console.log(`Found ${shots.length} result(s) for "${query}":\n`);

  for (let i = 0; i < shots.length; i++) {
    const shot = shots[i];
    await shot.generateStream();
    const start = Math.floor(shot.start);
    const end = Math.floor(shot.end);
    const score = shot.searchScore ? ` (score: ${shot.searchScore.toFixed(2)})` : "";

    console.log(`${i + 1}. [${start}s - ${end}s]${score}`);
    if (shot.text) console.log(`   ${shot.text}`);
    if (shot.streamUrl) console.log(`   Watch: ${shot.streamUrl}`);
    console.log();
  }
}

async function summary(hours: number) {
  log(`summary: hours=${hours}`);
  const { session } = await loadSession();

  const screens = session.getRTStream("screen");
  if (screens.length === 0) {
    log("summary: no screen stream found");
    console.log("No screen stream found");
    return;
  }

  const screen = screens[0];
  const now = Math.floor(Date.now() / 1000);
  const start = now - Math.floor(hours * 3600);

  const indexes = getManagedIndexes(await screen.listSceneIndexes(), "visual");
  if (indexes.length === 0) {
    log("summary: no visual index found");
    console.log("No visual index found. Start one with `videodb start-visual-index`.");
    return;
  }

  const index = indexes[0];
  if (!index.getScenes) {
    console.log("Selected visual index does not support scene retrieval");
    return;
  }
  const result = await index.getScenes(start, now, 1, 50);

  if (!result || result.scenes.length === 0) {
    log(`summary: no activity in last ${hours} hours`);
    console.log(`No activity indexed in the last ${hours} hour(s)`);
    return;
  }

  log(`summary: found ${result.scenes.length} scenes`);
  console.log(`Screen activity (last ${hours} hour(s)):\n`);

  for (const scene of result.scenes as any[]) {
    const time = new Date((scene.start || scene.timestamp) * 1000).toLocaleTimeString();
    const text = scene.text || scene.description || JSON.stringify(scene);
    console.log(`[${time}] ${text}`);
  }
}

async function transcript(hours: number) {
  log(`transcript: hours=${hours}`);
  const { session } = await loadSession();

  const audios = session.getRTStream("system_audio");
  if (audios.length === 0) {
    log("transcript: no audio stream found");
    console.log("No audio stream found");
    return;
  }

  const audio = audios[0];
  const now = Math.floor(Date.now() / 1000);
  const start = now - Math.floor(hours * 3600);

  const data = await audio.getTranscript({ start, end: now, pageSize: 100 });
  const segments = (data.segments || data.transcriptions || []) as any[];

  log(`transcript: found ${segments.length} segments`);

  if (segments.length === 0) {
    console.log(`No transcripts in the last ${hours} hour(s)`);
    return;
  }

  console.log(`Transcripts (last ${hours} hour(s)):\n`);

  for (const seg of segments) {
    const time = new Date((seg.start || seg.timestamp) * 1000).toLocaleTimeString();
    console.log(`[${time}] ${seg.text}`);
  }
}

async function stream(startTs: number, endTs: number, args: string[]) {
  const title = parseFlagValue(args, "--title");
  const description = parseFlagValue(args, "--description");
  log(
    `stream: start=${startTs} end=${endTs}` +
      (title ? ` title="${title}"` : "") +
      (description ? ` description="${description}"` : "")
  );

  if (!startTs || !endTs || isNaN(startTs) || isNaN(endTs)) {
    console.error(
      "Usage: videodb stream <start_unix_timestamp> <end_unix_timestamp> [--title TITLE] [--description DESCRIPTION]"
    );
    console.error(
      'Example: videodb stream 1709740800 1709740810 --title "Checkout flow" --description "OpenClaw browser run"'
    );
    process.exit(1);
  }

  if (endTs <= startTs) {
    console.error("Error: end timestamp must be greater than start timestamp");
    process.exit(1);
  }

  const { session } = await loadSession();

  const screens = session.getRTStream("screen");
  if (screens.length === 0) {
    log("stream: no screen stream found");
    console.log("No screen stream found");
    return;
  }

  const screen = screens[0];
  const url = await screen.generateStream(
    startTs,
    endTs,
    title || description ? { title, description } : undefined
  );

  if (url) {
    log(`stream: generated ${url}`);
    const duration = endTs - startTs;
    console.log(`📹 Screen recording (${duration}s): ${url}`);
    console.log(`Player page: ${url}`);
  } else {
    log("stream: no URL generated");
    console.log("Could not generate stream URL for the specified time range");
  }
}

async function main() {
  const [, , cmd, ...args] = process.argv;

  switch (cmd) {
    case "start-indexing":
      await startIndexing(args);
      break;

    case "stop-indexing":
      await stopIndexing(args);
      break;

    case "start-visual-index":
      await startVisualIndex(parseFlagValue(args, "--prompt") || DEFAULT_VISUAL_PROMPT);
      break;

    case "stop-visual-index":
      await stopVisualIndex();
      break;

    case "start-transcript":
      await startTranscript(parseFlagValue(args, "--engine") || "assemblyai");
      break;

    case "stop-transcript":
      await stopTranscript(
        parseFlagValue(args, "--engine") || "assemblyai",
        parseFlagValue(args, "--mode") === "force" ? "force" : "graceful"
      );
      break;

    case "start-audio-index":
      await startAudioIndex(parseFlagValue(args, "--prompt") || DEFAULT_AUDIO_PROMPT);
      break;

    case "stop-audio-index":
      await stopAudioIndex();
      break;

    case "search":
      if (args.length === 0) {
        console.error("Usage: videodb search <query>");
        process.exit(1);
      }
      await search(args.join(" "));
      break;

    case "summary": {
      let hours = 0.5;
      const idx = args.indexOf("--hours");
      if (idx !== -1 && args[idx + 1]) hours = parseFloat(args[idx + 1]);
      await summary(hours);
      break;
    }

    case "transcript": {
      let hours = 0.5;
      const idx = args.indexOf("--hours");
      if (idx !== -1 && args[idx + 1]) hours = parseFloat(args[idx + 1]);
      await transcript(hours);
      break;
    }

    case "stream": {
      const startTs = parseInt(args[0], 10);
      const endTs = parseInt(args[1], 10);
      await stream(startTs, endTs, args);
      break;
    }

    case "now":
      console.log(Math.floor(Date.now() / 1000));
      break;

    default:
      console.log("VideoDB Screen Recording Tool\n");
      console.log("Commands:");
      console.log("  videodb start-indexing [--visual-prompt P] [--audio-prompt P] [--engine E]");
      console.log("  videodb stop-indexing [--engine E] [--mode graceful|force]");
      console.log("  videodb start-visual-index [--prompt P]");
      console.log("  videodb stop-visual-index");
      console.log("  videodb start-transcript [--engine E]");
      console.log("  videodb stop-transcript [--engine E] [--mode graceful|force]");
      console.log("  videodb start-audio-index [--prompt P]");
      console.log("  videodb stop-audio-index");
      console.log(
        "  videodb stream <start> <end> [--title T] [--description D]   Generate stream URL"
      );
      console.log("  videodb search <query>         Search screen recordings");
      console.log("  videodb summary [--hours N]    Get activity summary");
      console.log("  videodb transcript [--hours N] Get audio transcripts");
      console.log("  videodb now                    Print current unix timestamp");
  }
}

main().catch((err) => {
  log(`error: ${err.message}`);
  console.error(err.message);
  process.exit(1);
});
