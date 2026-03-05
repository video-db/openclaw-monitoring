---
name: videodb
description: "Sends screen recording links after agent responses"
metadata:
  openclaw:
    emoji: "📹"
    events: ["message:received", "message:sent"]
    requires:
      config: ["hooks.internal.entries.videodb.apiKey"]
---

# VideoDB Screen Replay

Records your screen. When the agent responds, sends a clip of what happened.

## Setup

```bash
# Set API key
openclaw config set hooks.internal.entries.videodb.apiKey "sk-xxx"

# Install hook
cp -r openclaw-hook-ts ~/.openclaw/hooks/videodb
openclaw hooks enable videodb

# Start recording
cd openclaw-hook-ts && npm install && npx tsx monitor.ts
```

## Config

| Key | Default |
|-----|---------|
| `hooks.internal.entries.videodb.apiKey` | - |
| `hooks.internal.entries.videodb.captureSessionId` | (auto) |
| `hooks.internal.entries.videodb.minClipDuration` | 2 |
| `hooks.internal.entries.videodb.maxClipDuration` | 300 |
| `hooks.internal.entries.videodb.clipBuffer` | 1 |
