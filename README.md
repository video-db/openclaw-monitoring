<!-- PROJECT SHIELDS -->
[![Python][python-shield]][python-url]
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

Point your OpenClaw agent at this repo and ask it to install the skill:

```text
please install https://github.com/video-db/openclaw-monitoring/ skill and set it up
```

Or install it manually:

```bash
git clone https://github.com/video-db/openclaw-monitoring.git
mkdir -p ~/.openclaw/workspace/skills/videodb-monitoring
cp -r openclaw-monitoring/videodb-monitoring-skill/* ~/.openclaw/workspace/skills/videodb-monitoring/
cd ~/.openclaw/workspace/skills/videodb-monitoring
npm install
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

The monitor writes process information and capture IDs into `~/.openclaw/openclaw.json`.

This starts the monitor as a background process and restarts OpenClaw so the skill is available to the agent. When the agent uses the skill, it starts the VideoDB capture process. Ingestion is billed at `$0.084 / hour`. See the [Capture SDK overview](https://docs.videodb.io/pages/ingest/capture-sdks/overview) for more documentation.

**4. Use it:**

- "Do X on the browser and send me the recording"
- "What did I do in the last hour?"
- "Find when I opened the spreadsheet"

See [`videodb-monitoring-skill/README.md`](videodb-monitoring-skill/README.md) for details.

### Option 2: Indexing with VideoDB

After recording starts, OpenClaw can use VideoDB to index sessions, create alerts, and search important moments.

Example prompts:

```text
start visual indexing for the current session with the prompt: "Describe what is on screen, the active app, and what the agent is doing."
```

```text
set up a summary cron for this session that sends me a summary every 30 minutes
```

```text
search this session for when the agent opened the spreadsheet and share the results with timestamps
```

See the [Advanced Setup Guide](ADVANCE_SETUP_GUIDE.md) for setup details and SDK/code examples.

### Need to set up OpenClaw from scratch?

See the [Full Setup Guide](SETUP_GUIDE.md) for EC2 Mac provisioning and OpenClaw installation.

---

## Try It Without Any Setup

Skip the installation and try indexing against our hosted real-time OpenClaw session at [matrix.videodb.io](https://matrix.videodb.io):

```bash
echo "VIDEO_DB_API_KEY=your_api_key_here" > .env
uv run try_without_setup.py
```

This connects to the public agent's live streams, starts indexing, and prints events to your terminal. Press `Ctrl+C` to stop and search the indexed content.

---

See the [Advanced Setup Guide](ADVANCE_SETUP_GUIDE.md) for working with recordings, search, alerts, indexing, and SDK examples.

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
[stars-shield]: https://img.shields.io/github/stars/video-db/openclaw-monitoring.svg?style=for-the-badge
[stars-url]: https://github.com/video-db/openclaw-monitoring/stargazers
[issues-shield]: https://img.shields.io/github/issues/video-db/openclaw-monitoring.svg?style=for-the-badge
[issues-url]: https://github.com/video-db/openclaw-monitoring/issues
[website-shield]: https://img.shields.io/website?url=https%3A%2F%2Fvideodb.io%2F&style=for-the-badge&label=videodb.io
[website-url]: https://videodb.io/
