---
name: videodb
description: Search screen recordings and get summaries of agent activity. Use when the user asks to find something that happened on screen, or wants a summary of recent activity.
metadata:
  {
    "openclaw":
      {
        "emoji": "📹",
        "requires": { "config": ["hooks.internal.entries.videodb.apiKey"] },
        "primaryEnv": "VIDEODB_API_KEY",
      },
  }
---

# VideoDB Screen Recording Skill

You have access to indexed screen recordings of this machine. The recordings include:
- Visual index: descriptions of what's happening on screen
- Audio index: transcripts of system audio

## Tools

### videodb_search

Search the screen recordings for specific events or content.

```bash
videodb search "user opened Amazon"
videodb search "error message appeared"
videodb search "meeting with John"
```

Returns matching time ranges with playable stream URLs.

### videodb_summary

Get a summary of recent screen activity.

```bash
videodb summary              # last 30 minutes
videodb summary --hours 2    # last 2 hours
```

### videodb_transcript

Get raw transcripts from system audio.

```bash
videodb transcript           # last 30 minutes
videodb transcript --hours 1 # last hour
```

## Usage

When the user asks:
- "What did I do in the last hour?" → use `videodb summary`
- "Find when I opened the spreadsheet" → use `videodb search "opened spreadsheet"`
- "What was said in that meeting?" → use `videodb transcript`

Always include the stream URLs in your response so the user can watch the clips.
