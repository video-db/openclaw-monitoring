# VideoDB Monitor for OpenClaw

Screen capture daemon and skill for OpenClaw agents. Records your screen continuously and lets the agent generate playable stream URLs for every interaction.

## Prerequisites

- OpenClaw installed and running
- VideoDB API key ([get one here](https://console.videodb.io))
- Node.js 18+

## Setup

### Step 1: Configure OpenClaw

Set your VideoDB API key in OpenClaw config:

```bash
openclaw config set hooks.internal.entries.videodb.apiKey 'sk-xxx'
```

### Step 2: Install Dependencies

```bash
cd monitor
npm install
```

### Step 3: Start the Monitor

Run the screen capture daemon:

```bash
npx tsx monitor.ts
```

You should see:

```
[...] VideoDB Screen Monitor starting
[...] API key: sk-xxx...
[...] session created: cap-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
[...] recording started
```

Keep this terminal running. The monitor captures your screen and uploads it to VideoDB.

### Step 4: Install the Skill

In a new terminal, copy the skill to OpenClaw:

```bash
cd monitor
mkdir -p ~/.openclaw/workspace/skills/videodb
cp -r openclaw-skill/* ~/.openclaw/workspace/skills/videodb
cd ~/.openclaw/workspace/skills/videodb
npm install
```

### Step 5: Restart OpenClaw Gateway

```bash
openclaw gateway restart
```

Or if the gateway isn't running:

```bash
openclaw gateway start
```

### Step 6: Verify

Check the skill is loaded:

```bash
openclaw skills list
```

You should see `videodb` in the list.

## Usage

Once set up, the agent will:

1. Note the timestamp when you send a message
2. Process your request
3. Generate a screen recording URL for the interaction
4. Include the URL in its response

### Manual Commands

Ask the agent to:

- **Search recordings**: "Find when I opened the spreadsheet"
- **Get summary**: "What did I do in the last hour?"
- **Get transcript**: "What was said in that meeting?"

## Logs

Logs are written to `~/.videodb/logs/`:

| File | Description |
|------|-------------|
| `monitor.log` | Screen capture daemon logs |
| `skill.log` | Skill command execution logs |

## Troubleshooting

### "Another recorder instance is already running"

Kill existing instances and restart:

```bash
pkill -9 -f videodb_recorder
pkill -9 -f "monitor.ts"
npx tsx monitor.ts
```

### "No capture session"

Make sure `monitor.ts` is running. It automatically updates the session ID in OpenClaw config.

### "Permission denied" for microphone

The monitor will continue without audio. Screen recording still works.

### Skill not appearing

1. Verify skill is in `~/.openclaw/workspace/skills/videodb/`
2. Check `SKILL.md` exists in that directory
3. Run `openclaw restart`
4. Run `openclaw skills list`

## File Structure

```
monitor/
├── monitor.ts          # Screen capture daemon
├── package.json        # Dependencies
└── openclaw-skill/     # Skill files (copy to OpenClaw)
    ├── SKILL.md        # Skill definition
    ├── videodb.ts      # CLI tool
    ├── package.json    # Skill dependencies
    └── README.md       # Skill documentation
```
