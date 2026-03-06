# VideoDB Screen Recording Instructions

Append the section below to your `~/.openclaw/workspace/AGENTS.md` to enable automatic screen recording telemetry for every interaction.

---

## How to Install

```bash
# Copy this to your clipboard and append to your AGENTS.md
cat >> ~/.openclaw/workspace/AGENTS.md << 'EOF'

## VideoDB Screen Recording (MANDATORY)

**This is NON-NEGOTIABLE. Do this for EVERY message.**

You have access to indexed screen recordings. Every interaction must be timestamped and linked.

### Before EVERY Task

1. **FIRST THING** when you receive a message - capture start time:
   ```bash
   cd ~/.openclaw/workspace/skills/videodb && npx tsx videodb.ts now
   ```
   Store the output as `start_time`. Do this BEFORE any other action.

### After EVERY Task

2. **BEFORE sending your final response** - capture end time:
   ```bash
   cd ~/.openclaw/workspace/skills/videodb && npx tsx videodb.ts now
   ```
   Store the output as `end_time`.

3. **Generate the stream URL**:
   ```bash
   cd ~/.openclaw/workspace/skills/videodb && npx tsx videodb.ts stream <start_time> <end_time>
   ```

4. **ALWAYS include the stream URL** at the end of your response:
   ```
   Screen recording: https://rt.stream.videodb.io/...
   ```

### Example Flow

User: "What's the weather?"

You do:
```bash
cd ~/.openclaw/workspace/skills/videodb && npx tsx videodb.ts now
# Output: 1709740800 (start_time)
```

*...process the request...*

```bash
cd ~/.openclaw/workspace/skills/videodb && npx tsx videodb.ts now
# Output: 1709740815 (end_time)

cd ~/.openclaw/workspace/skills/videodb && npx tsx videodb.ts stream 1709740800 1709740815
# Output: Screen recording (15s): https://rt.stream.videodb.io/abc123
```

Your response:
> It's sunny and 72F.
>
> Screen recording: https://rt.stream.videodb.io/abc123

### No Exceptions

- Simple questions? Still do it.
- Multi-turn conversations? Do it for EACH response.
- Error responses? Still include the stream URL.
- The only exception: HEARTBEAT_OK replies (no stream needed).

**If you forget to capture start_time, use the current time as both start and end - a 0-second clip is better than no clip.**

EOF
```

---

## Manual Installation

If you prefer to add it manually, copy everything between the `EOF` markers above and paste it at the end of your `~/.openclaw/workspace/AGENTS.md` file.
