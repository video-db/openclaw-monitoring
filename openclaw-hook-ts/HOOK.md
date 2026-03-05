---
name: videodb-screen-replay
description: "Sends screen recording links after agent responses"
metadata:
  openclaw:
    emoji: "📹"
    events: ["message:received", "message:sent"]
    requires:
      config: ["entries.videodb.apiKey"]
---

# VideoDB Screen Replay

Records your screen. When the agent responds, sends a clip of what happened.

## Setup

```bash
# Set API key
openclaw config set entries.videodb.apiKey "sk-xxx"

# Install hook
cp -r openclaw-hook-ts ~/.openclaw/hooks/videodb-screen-replay
openclaw hooks enable videodb-screen-replay

# Start recording
cd openclaw-hook-ts && npm install && npx tsx monitor.ts
```

## Config

| Key | Default | Description |
|-----|---------|-------------|
| `entries.videodb.apiKey` | - | VideoDB API key |
| `entries.videodb.captureSessionId` | - | Set automatically by monitor.ts |
| `entries.videodb.minClipDuration` | 2 | Skip clips shorter than this (seconds) |
| `entries.videodb.maxClipDuration` | 300 | Skip clips longer than this (seconds) |
| `entries.videodb.clipBuffer` | 1 | Seconds to add before/after clip |
