# Advanced Setup Guide

This guide explains the VideoDB objects used behind the scenes by this repo: capture sessions, real-time streams, indexing, search, and alerts.

## Core Model

- A monitor creates a VideoDB `capture_session`
- Each session contains one or more `rtstream`s such as `screen` and `system_audio`
- Indexing runs on those streams to make them searchable
- Alerts are created on top of indexed visual or audio events

Relevant implementation references:

- Monitor and capture lifecycle: [`videodb-monitoring-skill/monitor.ts`](/Users/ashish/Projects/videodb/openclaw-monitoring/videodb-monitoring-skill/monitor.ts)
- Stream/search helpers: [`videodb-monitoring-skill/videodb.ts`](/Users/ashish/Projects/videodb/openclaw-monitoring/videodb-monitoring-skill/videodb.ts)
- 24/7 backend path: [`backend.py`](/Users/ashish/Projects/videodb/openclaw-monitoring/backend.py)
- Continuous capture client: [`start_monitoring.py`](/Users/ashish/Projects/videodb/openclaw-monitoring/start_monitoring.py)

## Capture Session

```python
import videodb

conn = videodb.connect(api_key="your_api_key")
session = conn.get_capture_session("your_capture_session_id")
```

The session is the top-level object for one monitored run.

## Real-Time Streams

```python
displays = session.get_rtstream("screen")
system_audios = session.get_rtstream("system_audio")

display = displays[0]
audio = system_audios[0]
```

`screen` is used for visual indexing and replay. `system_audio` is used for transcript and audio indexing.

## Live and Replay URLs

```python
live_url = display.get_stream_url()
replay_url = display.get_stream_url()
clip_url = display.generate_clip(start=120, end=180)
```

Use these URLs for live monitoring, replay, and clipped exports.

## Visual and Audio Indexing

```python
ws = conn.connect_websocket()
ws = await ws.connect()

visual_index = display.index_visuals(
    prompt="Describe the active application and what the agent is doing.",
    batch_config={"type": "time", "value": 5, "frame_count": 1},
    ws_connection_id=ws.connection_id,
)

audio.start_transcript(ws_connection_id=ws.connection_id)
audio.index_audio(
    prompt="Summarize the audio content.",
    batch_config={"type": "time", "value": 30},
    ws_connection_id=ws.connection_id,
)
```

Visual indexing makes screen activity searchable. Audio indexing adds transcript and audio summaries.

## Search

```python
results = display.search(query="agent encountered an error", result_threshold=5)
shots = results.get_shots()

for shot in shots:
    print(f"[{shot.start:.0f}s - {shot.end:.0f}s] {shot.text}")
```

Search returns timestamped moments from indexed streams.

## Alerts

```python
event_id = conn.create_event(
    event_prompt="The agent is displaying an error or crash dialog on screen.",
    label="agent-error",
)

alert_id = visual_index.create_alert(
    event_id=event_id,
    callback_url="https://your-webhook-url/webhook",
    ws_connection_id=ws.connection_id,
)
```

Alerts sit on top of indexed output and can publish over WebSocket or webhook callbacks.

## Real-Time Events

```python
async for msg in ws.receive():
    channel = msg.get("channel")
    data = msg.get("data", {})

    if channel == "transcript":
        print(f"Transcript: {data.get('text')}")
    elif channel == "visual_index":
        print(f"Visual: {data.get('text')}")
    elif channel == "alert":
        print(f"ALERT [{data.get('label')}]: {data.get('text')}")
```

## 24/7 Backend

If you want to run continuous monitoring outside the OpenClaw skill flow:

```bash
git clone https://github.com/video-db/openclaw-monitoring.git
cd openclaw-monitoring
echo "VIDEO_DB_API_KEY=your_api_key_here" > .env
uv run backend.py
```

Then on the Mac running OpenClaw:

```bash
brew install uv
uv run start_monitoring.py
```
