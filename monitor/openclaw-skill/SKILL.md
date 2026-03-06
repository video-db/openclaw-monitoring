---
name: videodb
description: Screen recording telemetry. READ THIS SKILL FIRST before starting any task to understand the telemetry requirements. You must generate a stream URL after EVERY response.
metadata: { "openclaw": { "emoji": "📹", "requires": { "config": ["hooks.internal.entries.videodb.apiKey"] }, "primaryEnv": "VIDEODB_API_KEY", "always": true } }
---

# VideoDB Screen Recording Skill

You have access to indexed screen recordings of this machine.

Run commands from `{baseDir}` using `npx tsx videodb.ts`.

## CRITICAL: Stream URL After Every Response

**After EVERY successful response you send to the user, you MUST generate a screen recording stream URL.**

### Workflow:

1. **When you receive a user message**, immediately get the current unix timestamp:
   ```bash
   cd {baseDir} && npx tsx videodb.ts now
   ```
   Store this as `start_time`.

2. **Process the user's request normally.**

3. **Before sending your final response**, get the current timestamp again for `end_time`.

4. **Generate the stream URL**:
   ```bash
   cd {baseDir} && npx tsx videodb.ts stream <start_time> <end_time>
   ```

5. **Include the stream URL** at the end of your response.

### Example:

User asks: "What's 2+2?"

You do:
```bash
cd {baseDir} && npx tsx videodb.ts now
# Output: 1709740800 (this is start_time)
```

Then process the question, and before responding:
```bash
cd {baseDir} && npx tsx videodb.ts now
# Output: 1709740815 (this is end_time)

cd {baseDir} && npx tsx videodb.ts stream 1709740800 1709740815
# Output: 📹 Screen recording (15s): https://rt.stream.videodb.io/...
```

Your response:
> 2 + 2 = 4
>
> 📹 Screen recording: https://rt.stream.videodb.io/...

## Other Commands

### Search

Search the screen recordings for specific events:

```bash
cd {baseDir} && npx tsx videodb.ts search "user opened Amazon"
```

### Summary

Get a summary of recent screen activity:

```bash
cd {baseDir} && npx tsx videodb.ts summary              # last 30 minutes
cd {baseDir} && npx tsx videodb.ts summary --hours 2    # last 2 hours
```

### Transcript

Get audio transcripts:

```bash
cd {baseDir} && npx tsx videodb.ts transcript           # last 30 minutes
cd {baseDir} && npx tsx videodb.ts transcript --hours 1 # last hour
```

## Unix Timestamps

All time parameters use **unix timestamps** (seconds since epoch).

- Use `videodb now` to get the current unix timestamp
- Example: `1709740800` = March 6, 2024 at some time
- The `stream` command requires both start and end as unix timestamps

## When to Use

- After EVERY response → use `stream` with start/end timestamps
- "What did I do in the last hour?" → use `summary`
- "Find when I opened the spreadsheet" → use `search "opened spreadsheet"`
- "What was said in that meeting?" → use `transcript`

Always include stream URLs in your response so the user can watch the clips.
