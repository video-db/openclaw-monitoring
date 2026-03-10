<!-- PROJECT SHIELDS -->
[![Python][python-shield]][python-url]
[![Flask][flask-shield]][flask-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![Website][website-shield]][website-url]

<!-- PROJECT LOGO -->
<br />
<p align="center">
  <a href="https://videodb.io/">
    <img src="https://codaio.imgix.net/docs/_s5lUnUCIU/blobs/bl-RgjcFrrJjj/d3cbc44f8584ecd42f2a97d981a144dce6a66d83ddd5864f723b7808c7d1dfbc25034f2f25e1b2188e78f78f37bcb79d3c34ca937cbb08ca8b3da1526c29da9a897ab38eb39d084fd715028b7cc60eb595c68ecfa6fa0bb125ec2b09da65664a4f172c2f" alt="Logo" width="300" height="">
  </a>

  <h1 align="center">CCTV for OpenClaw Agents</h1>

  <p align="center">
    <strong>Your AI agent just did something on a remote server. Do you know what?</strong>
    <br />
    <br />
    Record every agent session. Watch runs live. Replay with a shareable link. Get alerts when something looks suspicious — or hilarious.
    <br />
    <br />
    <a href="#quick-start">Quick Start</a>
    ·
    <a href="#try-it-without-any-setup">Try Without Setup</a>
    ·
    <a href="#working-with-recordings">Recordings</a>
    ·
    <a href="https://docs.videodb.io">Docs</a>
  </p>
</p>

---

## The Problem

Right now, most people running AI agents are doing this:

```
Send task → Wait → Get "Success" in Slack → Hope for the best
```

That's not monitoring. That's faith.

When your agent runs on a remote server for hours, you have no idea what it's actually doing. Did it complete the task? Did it get stuck on a captcha? Did it wander somewhere it shouldn't?

You'd never know.

## The Solution

**VideoDB Monitoring** turns your OpenClaw agent into an observable, auditable worker.

Every run becomes:
- **A live stream** — watch your agent work in real-time
- **A replayable recording** — shareable URL, not a dead video file
- **Searchable moments** — find "when did it open the spreadsheet?"
- **Webhook alerts** — get notified when something looks off

Think: dashcam for your AI agent. Black box recorder for browser automation. CCTV for computer-use agents.

---

## What You Can Do

### The Fun Stuff

Ask your agent to do something, then watch it back:

- "Play chess on chess.com and send me the recording"
- "Create a Twitter account and show me how you did it"
- "Check all the GitHub repos and give me a video report"
- "Order food from Swiggy — I want to see the whole process"

Every session becomes a clip you can share.

### The Serious Stuff

- **Security** — catch agents going off-script or accessing unexpected domains
- **QA** — review agent workflows before pushing to production
- **Debugging** — replay failures to see exactly where things went wrong
- **Compliance** — full visual audit trail of agent actions
- **Dataset prep** — build computer-use training data from real sessions

### The Meta Stuff

Your agent can even use its own recordings:

- "Summarize what you did in the last 2 hours"
- "Make a highlight video of today's work and post it to YouTube"
- "Find the moment when you encountered the error"

The agent becomes a content creator with receipts.

---

## Quick Start

### Option 1: OpenClaw Skill (Recommended)

Add on-demand screen recording to your existing OpenClaw agent.

**1. Install the skill:**

```bash
git clone https://github.com/video-db/openclaw-monitoring.git
mkdir -p ~/.openclaw/workspace/skills/videodb-monitoring
cp -r openclaw-monitoring/videodb-monitoring-skill/* ~/.openclaw/workspace/skills/videodb-monitoring/
cd ~/.openclaw/workspace/skills/videodb-monitoring && npm install
```

**2. Set your VideoDB API key:**

```bash
openclaw config set skills.entries.videodb-monitoring.env.VIDEODB_API_KEY 'sk-xxx'
```

Get your API key at [console.videodb.io](https://console.videodb.io).

**3. Start the monitor and restart OpenClaw:**

```bash
cd ~/.openclaw/workspace/skills/videodb-monitoring
nohup npx tsx monitor.ts > ~/.videodb/logs/monitor.log 2>&1 & disown
openclaw gateway restart
```

**4. Use it:**

- "Do X on the browser and send me the recording"
- "What did I do in the last hour?"
- "Find when I opened the spreadsheet"

See [`videodb-monitoring-skill/README.md`](videodb-monitoring-skill/README.md) for details.

### Option 2: 24/7 Monitoring Backend

For continuous monitoring with alerts and webhooks, run the full backend:

**1. Set up environment:**

```bash
git clone https://github.com/video-db/openclaw-monitoring.git
cd openclaw-monitoring
echo "VIDEO_DB_API_KEY=your_api_key_here" > .env
```

**2. Start the backend** (on your local machine or server):

```bash
uv run backend.py
```

This starts a Cloudflare tunnel and prints the public URL.

**3. Start the client** (on the Mac running OpenClaw, via VNC):

```bash
brew install uv
uv run start_monitoring.py
```

Enter the backend URL when prompted. Grant screen capture permission.

The client streams screen + audio 24/7 to VideoDB. The backend handles:
- Session management
- Real-time transcription and visual indexing
- Alerts (agent errors, suspicious behavior)
- Webhook notifications

### Need to set up OpenClaw from scratch?

See the [Full Setup Guide](SETUP_GUIDE.md) for EC2 Mac provisioning and OpenClaw installation.

---

## Try It Without Any Setup

Skip the installation and connect to VideoDB's hosted OpenClaw agent:

```bash
echo "VIDEO_DB_API_KEY=your_api_key_here" > .env
uv run try_without_setup.py
```

This connects to the agent's live streams, starts indexing, and prints events to your terminal. Press `Ctrl+C` to stop and search the indexed content.

---

## Working with Recordings

Once monitoring is running, you can work with sessions and streams using the VideoDB Python SDK.

### Get a Session

```python
import videodb

conn = videodb.connect(api_key="your_api_key")
session = conn.get_capture_session("your_capture_session_id")
```

The `capture_session_id` is printed when the client starts.

### Get Streams

```python
displays = session.get_rtstream("screen")
system_audios = session.get_rtstream("system_audio")

display = displays[0]
audio = system_audios[0]
```

### Watch Live

Get the live stream URL while the agent is working:

```python
live_url = display.get_stream_url()
print(f"Watch live: {live_url}")
```

### Get Shareable Replay Link

Generate a playable URL for any recording:

```python
# Get the replay URL for the entire session
replay_url = display.get_stream_url()
print(f"Replay: {replay_url}")

# Or generate a clip from a specific time range
clip_url = display.generate_clip(start=120, end=180)  # 2:00 to 3:00
print(f"Clip: {clip_url}")
```

### Search Recordings

Find specific moments using natural language:

```python
results = display.search(query="agent encountered an error", result_threshold=5)
shots = results.get_shots()

for shot in shots:
    print(f"[{shot.start:.0f}s - {shot.end:.0f}s] {shot.text}")
```

### Create Alerts

Get notified when specific conditions appear on screen:

```python
# Define what to watch for
event_id = conn.create_event(
    event_prompt="The agent is displaying an error or crash dialog on screen.",
    label="agent-error",
)

# Start visual indexing with alerts
visual_index = display.index_visuals(
    prompt="Describe what is on screen.",
    ws_connection_id=ws.connection_id,
)

alert_id = visual_index.create_alert(
    event_id=event_id,
    callback_url="https://your-webhook-url/webhook",
    ws_connection_id=ws.connection_id,
)
```

### Index for Searchability

Start AI indexing to make recordings searchable:

```python
# Set up WebSocket for real-time results
ws = conn.connect_websocket()
ws = await ws.connect()

# Visual indexing (what's on screen)
visual_index = display.index_visuals(
    prompt="Describe the active application and what the agent is doing.",
    batch_config={"type": "time", "value": 5, "frame_count": 1},
    ws_connection_id=ws.connection_id,
)

# Audio indexing (transcription + summarization)
audio.start_transcript(ws_connection_id=ws.connection_id)
audio.index_audio(
    prompt="Summarize the audio content.",
    batch_config={"type": "time", "value": 30},
    ws_connection_id=ws.connection_id,
)
```

### Listen for Real-Time Events

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

### Stop and Export

When you're done, stop the session and export the recording:

```python
# Stop the capture session
session.stop()

# Export to a permanent video file
video = session.export()
print(f"Exported: {video.stream_url}")
```

---

## Customizing Alerts

The backend includes default alerts in `backend.py`:

```python
ALERTS = [
    {
        "label": "agent-error",
        "prompt": "The screen shows an error dialog, crash report, or exception traceback.",
    },
    {
        "label": "browser-open",
        "prompt": "A web browser window is open and visible on screen.",
    },
]
```

Add your own:

```python
ALERTS = [
    # ... existing alerts ...
    {
        "label": "login-attempt",
        "prompt": "The agent is on a login page or entering credentials.",
    },
    {
        "label": "payment-page",
        "prompt": "The agent is on a checkout or payment page.",
    },
]
```

Alerts fire in real-time via WebSocket and can trigger webhook callbacks.

---

## Community & Support

- **Docs**: [docs.videodb.io](https://docs.videodb.io)
- **Issues**: [GitHub Issues](https://github.com/video-db/openclaw-monitoring/issues)
- **Discord**: [Join community](https://discord.gg/py9P639jGz)
- **Console**: [Get API key](https://console.videodb.io)

---

<p align="center">
  <strong>Stop guessing what your AI is doing. Start watching.</strong>
</p>

<p align="center">Made with ❤️ by the <a href="https://videodb.io">VideoDB</a> team</p>

---

<!-- MARKDOWN LINKS & IMAGES -->
[python-shield]: https://img.shields.io/badge/Python-3.12+-3776AB?style=for-the-badge&logo=python&logoColor=white
[python-url]: https://www.python.org/
[flask-shield]: https://img.shields.io/badge/Flask-3.1-000000?style=for-the-badge&logo=flask&logoColor=white
[flask-url]: https://flask.palletsprojects.com/
[stars-shield]: https://img.shields.io/github/stars/video-db/openclaw-monitoring.svg?style=for-the-badge
[stars-url]: https://github.com/video-db/openclaw-monitoring/stargazers
[issues-shield]: https://img.shields.io/github/issues/video-db/openclaw-monitoring.svg?style=for-the-badge
[issues-url]: https://github.com/video-db/openclaw-monitoring/issues
[website-shield]: https://img.shields.io/website?url=https%3A%2F%2Fvideodb.io%2F&style=for-the-badge&label=videodb.io
[website-url]: https://videodb.io/
