# VideoDB Screen Recording Skill for OpenClaw

On-demand screen recording capabilities for OpenClaw agents. Record your screen and generate playable stream URLs when needed.

## Prerequisites

- OpenClaw installed and running
- VideoDB API key (get one at [console.videodb.io](https://console.videodb.io))
- Node.js 18+

## Installation

### 1. Copy Skill to OpenClaw

```bash
mkdir -p ~/.openclaw/workspace/skills/videodb-monitoring
cp -r ./* ~/.openclaw/workspace/skills/videodb-monitoring/
cd ~/.openclaw/workspace/skills/videodb-monitoring
npm install
```

### 2. Set API Key

```bash
openclaw config set skills.entries.videodb-monitoring.env.VIDEODB_API_KEY 'sk-xxx'
openclaw config set skills.entries.videodb-monitoring.enabled true
```

### 3. Restart Gateway

```bash
openclaw gateway restart
```

### 4. Verify

```bash
openclaw skills list
```

You should see `videodb-monitoring` in the list.

## How It Works

The skill is **on-demand** — the agent will use it when:
- You ask for a screen recording
- You want to search past activity
- You need transcripts of audio

The agent will:
1. Check if the API key is configured (ask you for it if not)
2. Start the monitor if not running
3. Capture timestamps and generate stream URLs
4. Include recording URLs in responses when requested

### Example Requests

- "Do X on the browser and send me the recording"
- "What did I do in the last hour?"
- "Find when I opened the spreadsheet"
- "What was said in that meeting?"

## Manual Monitor Control

The monitor can also be started manually:

```bash
cd ~/.openclaw/workspace/skills/videodb-monitoring

# Foreground (for testing)
npx tsx monitor.ts

# Background (for production)
nohup npx tsx monitor.ts > ~/.videodb/logs/monitor.log 2>&1 &
disown
```

Check status:
```bash
openclaw config get skills.entries.videodb-monitoring.isRunning
openclaw config get skills.entries.videodb-monitoring.captureSessionId
```

## Logs

All logs are stored in `~/.videodb/logs/`:

| File | Description |
|------|-------------|
| `monitor.log` | Screen capture monitor |
| `skill.log` | Skill command execution |

View logs:
```bash
tail -f ~/.videodb/logs/monitor.log
tail -f ~/.videodb/logs/skill.log
```

## Troubleshooting

### "API key not found"

Set your API key:
```bash
openclaw config set skills.entries.videodb-monitoring.env.VIDEODB_API_KEY 'sk-xxx'
```

### "No capture session"

Start the monitor:
```bash
cd ~/.openclaw/workspace/skills/videodb-monitoring
nohup npx tsx monitor.ts > ~/.videodb/logs/monitor.log 2>&1 &
disown
```

### "Another recorder instance is already running"

Kill existing instances:
```bash
pkill -9 -f videodb_recorder
pkill -9 -f "monitor.ts"
openclaw config set skills.entries.videodb-monitoring.isRunning false
```

Then restart the monitor.

### "Permission denied" for microphone

The monitor will continue without audio. Screen recording still works.

### Stale state after crash

Reset state manually:
```bash
openclaw config set skills.entries.videodb-monitoring.isRunning false
openclaw config set skills.entries.videodb-monitoring.captureSessionId ''
openclaw config set skills.entries.videodb-monitoring.monitorPid ''
```

## File Structure

```
videodb-monitoring/
├── SKILL.md        # Skill definition (read by OpenClaw)
├── monitor.ts      # Screen capture daemon
├── videodb.ts      # CLI tool for stream URLs, search, etc.
├── package.json    # Dependencies
└── README.md       # This file
```
