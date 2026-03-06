#!/usr/bin/env npx tsx
import { connect } from "videodb";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const CONFIG_PATH = path.join(os.homedir(), ".openclaw", "openclaw.json");

interface Config {
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

function loadConfig(): { apiKey: string; sessionId: string } {
  let apiKey = process.env.VIDEODB_API_KEY;
  let sessionId = process.env.VIDEODB_CAPTURE_SESSION_ID;

  try {
    const config: Config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
    apiKey = apiKey || config.hooks?.internal?.entries?.videodb?.apiKey;
    sessionId = sessionId || config.hooks?.internal?.entries?.videodb?.captureSessionId;
  } catch {
    // ignore
  }

  if (!apiKey) {
    console.error("VideoDB API key not configured");
    process.exit(1);
  }
  if (!sessionId) {
    console.error("No capture session. Run monitor.ts first.");
    process.exit(1);
  }

  return { apiKey, sessionId };
}

async function search(query: string) {
  const { apiKey, sessionId } = loadConfig();
  const conn = connect(apiKey);
  const coll = await conn.getCollection();
  const session = await coll.getCaptureSession(sessionId);
  await session.refresh();

  const screens = session.getRTStream("screen");
  if (screens.length === 0) {
    console.log("No screen stream found");
    return;
  }

  const screen = screens[0];
  const results = await screen.search({ query, resultThreshold: 5 });
  const shots = results.getShots();

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
  const { apiKey, sessionId } = loadConfig();
  const conn = connect(apiKey);
  const coll = await conn.getCollection();
  const session = await coll.getCaptureSession(sessionId);
  await session.refresh();

  const screens = session.getRTStream("screen");
  if (screens.length === 0) {
    console.log("No screen stream found");
    return;
  }

  const screen = screens[0];
  const now = Math.floor(Date.now() / 1000);
  const start = now - Math.floor(hours * 3600);

  const indexes = await screen.listSceneIndexes();
  if (indexes.length === 0) {
    console.log("No visual index found. Make sure indexing is running.");
    return;
  }

  const index = indexes[0];
  const result = await index.getScenes(start, now, 1, 50);

  if (!result || result.scenes.length === 0) {
    console.log(`No activity indexed in the last ${hours} hour(s)`);
    return;
  }

  console.log(`Screen activity (last ${hours} hour(s)):\n`);

  for (const scene of result.scenes as any[]) {
    const time = new Date((scene.start || scene.timestamp) * 1000).toLocaleTimeString();
    const text = scene.text || scene.description || JSON.stringify(scene);
    console.log(`[${time}] ${text}`);
  }
}

async function transcript(hours: number) {
  const { apiKey, sessionId } = loadConfig();
  const conn = connect(apiKey);
  const coll = await conn.getCollection();
  const session = await coll.getCaptureSession(sessionId);
  await session.refresh();

  const audios = session.getRTStream("system_audio");
  if (audios.length === 0) {
    console.log("No audio stream found");
    return;
  }

  const audio = audios[0];
  const now = Math.floor(Date.now() / 1000);
  const start = now - Math.floor(hours * 3600);

  const data = await audio.getTranscript({ start, end: now, pageSize: 100 });
  const segments = (data.segments || data.transcriptions || []) as any[];

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

async function main() {
  const [, , cmd, ...args] = process.argv;

  switch (cmd) {
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

    default:
      console.log("VideoDB Screen Recording Tool\n");
      console.log("Commands:");
      console.log("  videodb search <query>        Search screen recordings");
      console.log("  videodb summary [--hours N]   Get activity summary");
      console.log("  videodb transcript [--hours N] Get audio transcripts");
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
