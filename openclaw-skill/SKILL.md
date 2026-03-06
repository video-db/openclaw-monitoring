---
name: videodb
description: Search screen recordings and get summaries of agent activity. Use when the user asks to find something that happened on screen, or wants a summary of recent activity.
metadata: { "openclaw": { "emoji": "📹", "requires": { "config": ["hooks.internal.entries.videodb.apiKey"] }, "primaryEnv": "VIDEODB_API_KEY" } }
---

# VideoDB Screen Recording Skill

You have access to indexed screen recordings of this machine. The recordings include:
- Visual index: descriptions of what's happening on screen
- Audio index: transcripts of system audio

Run commands from `{baseDir}` using `npx tsx videodb.ts`.

## Commands

### Search

Search the screen recordings for specific events or content.

```bash
cd {baseDir} && npx tsx videodb.ts search "user opened Amazon"
cd {baseDir} && npx tsx videodb.ts search "error message appeared"
```

Returns matching time ranges with playable stream URLs.

### Summary

Get a summary of recent screen activity.

```bash
cd {baseDir} && npx tsx videodb.ts summary              # last 30 minutes
cd {baseDir} && npx tsx videodb.ts summary --hours 2    # last 2 hours
```

### Transcript

Get raw transcripts from system audio.

```bash
cd {baseDir} && npx tsx videodb.ts transcript           # last 30 minutes
cd {baseDir} && npx tsx videodb.ts transcript --hours 1 # last hour
```

## When to Use

- "What did I do in the last hour?" → use summary
- "Find when I opened the spreadsheet" → use search "opened spreadsheet"
- "What was said in that meeting?" → use transcript

Always include the stream URLs in your response so the user can watch the clips.
