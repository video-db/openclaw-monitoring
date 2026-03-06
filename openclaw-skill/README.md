# VideoDB Screen Recording Skill for OpenClaw

Record your screen and let your OpenClaw agent generate playable stream URLs for every interaction.

## Prerequisites

- OpenClaw installed and running
- VideoDB API key (get one at [videodb.io](https://videodb.io))
- Node.js 18+

## Setup

### 1. Configure OpenClaw

Set your VideoDB API key:

```bash
openclaw config set hooks.internal.entries.videodb.apiKey 'sk-xxx'
```

### 2. Start the Screen Monitor

The monitor captures your screen and uploads it to VideoDB.

```bash
cd ~/Documents/Github/openclaw-monitoring/monitor
npm install
```

Run in foreground (for testing):
```bash
npx tsx monitor.ts
```

Run in background (for production):
```bash
nohup npx tsx monitor.ts >> ~/.videodb/logs/monitor.log 2>&1 &
```

Verify it's running:
```bash
tail -f ~/.videodb/logs/monitor.log
```

You should see:
```
[...] VideoDB Screen Monitor starting
[...] session created: cap-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
[...] recording started
```

### 3. Install the Skill

Copy the skill to your OpenClaw workspace:

```bash
cp -r ~/Documents/Github/openclaw-monitoring/openclaw-skill ~/.openclaw/workspace/skills/videodb
cd ~/.openclaw/workspace/skills/videodb
npm install
```

### 4. Restart OpenClaw Gateway

```bash
openclaw restart
```

### 5. Verify Skill is Loaded

```bash
openclaw skills list
```

You should see `videodb` in the list.

## Usage

Once set up, the agent will automatically:

1. Note the timestamp when you send a message
2. Process your request
3. Generate a screen recording URL for the interaction
4. Include the URL in its response

### Manual Commands

You can also ask the agent to:

- **Search recordings**: "Find when I opened the spreadsheet"
- **Get summary**: "What did I do in the last hour?"
- **Get transcript**: "What was said in that meeting?"

## Logs

All logs are stored in `~/.videodb/logs/`:

| File | Description |
|------|-------------|
| `monitor.log` | Screen capture monitor |
| `skill.log` | Skill command execution |
| `hook.log` | Hook events (if using hook) |

View logs:
```bash
tail -f ~/.videodb/logs/monitor.log
tail -f ~/.videodb/logs/skill.log
```

## Troubleshooting

### "Another recorder instance is already running"

Kill existing instances:
```bash
pkill -9 -f videodb_recorder
pkill -9 -f "monitor.ts"
```

Then restart the monitor.

### "No capture session"

Make sure monitor.ts is running. It automatically updates the session ID in OpenClaw config.

### "Permission denied" for microphone

The monitor will continue without audio. Screen recording still works.

### Skill not appearing

1. Check the skill is in `~/.openclaw/workspace/skills/videodb/`
2. Verify `SKILL.md` exists in that directory
3. Run `openclaw restart`
4. Run `openclaw skills list`

## File Structure

```
openclaw-monitoring/
├── monitor/
│   ├── monitor.ts      # Screen capture daemon
│   ├── handler.ts      # Hook handler (optional)
│   ├── HOOK.md         # Hook definition (optional)
│   └── package.json
└── openclaw-skill/
    ├── SKILL.md        # Skill definition
    ├── videodb.ts      # CLI tool
    ├── package.json
    └── README.md       # This file
```
