---
name: videodb-monitoring
description: Screen recording capabilities. Generate stream URLs, search recordings, get transcripts.
metadata: { "openclaw": { "emoji": "📹", "skillKey": "videodb-monitoring", "primaryEnv": "VIDEODB_API_KEY" } }
---

# VideoDB Screen Recording Skill

Screen recording capabilities powered by VideoDB. Use this when the user asks for screen recordings, wants to search past activity, or needs transcripts.

Run commands from `{baseDir}` using `npx tsx videodb.ts`.

## Prerequisites

### 1. Check API Key

Before using any commands, verify the API key is configured:

```bash
openclaw config get skills.entries.videodb-monitoring.env.VIDEODB_API_KEY
```

If **not set** or empty:
- Ask the user for their VideoDB API key
- If they provide it, set it for them:
  ```bash
  openclaw config set skills.entries.videodb-monitoring.env.VIDEODB_API_KEY 'sk-xxx'
  ```
- If they don't have one, direct them to: https://console.videodb.io

### 2. Check Monitor is Running

```bash
openclaw config get skills.entries.videodb-monitoring.env.VIDEODB_IS_RUNNING
```

If **not `true`**, start the monitor:

```bash
cd {baseDir} && nohup npx tsx monitor.ts > ~/.videodb/logs/monitor.log 2>&1 & disown && sleep 3
```

Verify it started:
```bash
openclaw config get skills.entries.videodb-monitoring.env.VIDEODB_CAPTURE_SESSION_ID
```

If you get a session ID (e.g., `cap-xxxxxxxx-...`), the monitor is ready.

## Commands

### Get Current Timestamp

```bash
cd {baseDir} && npx tsx videodb.ts now
```

Returns current Unix timestamp (seconds since epoch).

### Generate Stream URL

```bash
cd {baseDir} && npx tsx videodb.ts stream <start_timestamp> <end_timestamp>
```

Creates a playable recording URL for the time range.

### Search Recordings

```bash
cd {baseDir} && npx tsx videodb.ts search "user opened Amazon"
```

Searches indexed screen activity for matching events.

### Activity Summary

```bash
cd {baseDir} && npx tsx videodb.ts summary              # last 30 minutes
cd {baseDir} && npx tsx videodb.ts summary --hours 2    # last 2 hours
```

### Audio Transcripts

```bash
cd {baseDir} && npx tsx videodb.ts transcript           # last 30 minutes
cd {baseDir} && npx tsx videodb.ts transcript --hours 1 # last hour
```

## Recording Workflow

When user requests screen recording of a task:

1. **Capture start time**:
   ```bash
   cd {baseDir} && npx tsx videodb.ts now
   ```
   Store this as `start_time`.

2. **Do the work** (browser actions, file editing, etc.)

3. **Capture end time**:
   ```bash
   cd {baseDir} && npx tsx videodb.ts now
   ```

4. **Generate stream URL**:
   ```bash
   cd {baseDir} && npx tsx videodb.ts stream <start_time> <end_time>
   ```

5. **Include URL in response**:
   ```
   Screen recording: https://rt.stream.videodb.io/...
   ```

## Example

User: "Open example.com and send me the recording"

```bash
# Check prerequisites
openclaw config get skills.entries.videodb-monitoring.env.VIDEODB_IS_RUNNING
# true

# Start time
cd {baseDir} && npx tsx videodb.ts now
# 1709740800

# Do the work (open browser, navigate)
# ...

# End time
cd {baseDir} && npx tsx videodb.ts now
# 1709740830

# Generate URL
cd {baseDir} && npx tsx videodb.ts stream 1709740800 1709740830
# 📹 Screen recording (30s): https://rt.stream.videodb.io/abc123
```

Response:
> Done! I opened example.com.
>
> Screen recording: https://rt.stream.videodb.io/abc123

## When to Use

| User Request | Command |
|--------------|---------|
| "Record my screen while you do X" | Use workflow above |
| "What did I do in the last hour?" | `summary --hours 1` |
| "Find when I opened the spreadsheet" | `search "opened spreadsheet"` |
| "What was said in that meeting?" | `transcript` |
| "Get the recording from 5 mins ago" | `stream` with timestamps |

## Troubleshooting

If commands fail with "No capture session":
1. Check if monitor is running: `openclaw config get skills.entries.videodb-monitoring.env.VIDEODB_IS_RUNNING`
2. If not, start it (see Prerequisites above)
3. If it shows running but still fails, restart the monitor
