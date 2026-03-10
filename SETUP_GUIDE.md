# Full Setup Guide: EC2 Mac + OpenClaw

This guide walks you through deploying a macOS EC2 instance on AWS and installing OpenClaw on it. Once complete, return to the [main README](README.md) to set up VideoDB monitoring.

---

## Table of Contents

1. [EC2 Mac Setup](#1-ec2-mac-setup) — Provision and connect to a macOS instance on AWS
2. [OpenClaw Setup](#2-openclaw-setup) — Install and configure the OpenClaw agent

<p align="center">
  <em>Windows and Linux guides coming soon.</em>
</p>

---

# 1. EC2 Mac Setup

## Allocate Dedicated Host

1. Set region to **us-east-1** (best Mac availability)
2. Go to `EC2 → Dedicated Hosts → Allocate Dedicated Host`
3. Set: Instance family **Mac**, Instance type **mac1**, AZ **us-east-1c**, Auto-placement **Off**
4. Click **Allocate** and wait for `State = available`

> Mac hosts have **24-hour minimum billing**.

## Launch Instance

Go to `EC2 → Instances → Launch Instance`:

* **Name**: e.g. `openclaw`
* **AMI**: macOS Sequoia (Intel / x86_64) — architecture must be `x86_64`, do NOT select `arm64` or `Apple Silicon`
* **Instance type**: `mac1.metal`
* **Key pair**: Create or select an RSA `.pem` key pair
* **Security group**: Allow TCP 22 from your IP only. Do NOT open port 5900 publicly.
* **Storage**: Default 100GB is fine
* **Tenancy**: Dedicated host → select your mac1 host ID → set affinity to **Host**

Click **Launch** and wait a few minutes.

## Assign Elastic IP

Go to `EC2 → Elastic IPs → Allocate Elastic IP address`, then associate it with your instance. This keeps the IP stable across stop/start cycles.

## Connect via SSH

```bash
chmod 400 key.pem
ssh -i key.pem ec2-user@<public-ip>
```

## Enable GUI and VNC

Set a password and enable remote desktop:

```bash
sudo passwd ec2-user
sudo /System/Library/CoreServices/RemoteManagement/ARDAgent.app/Contents/Resources/kickstart \
  -activate -configure -access -on \
  -users ec2-user -privs -all \
  -restart -agent
```

Create an SSH tunnel from your laptop and connect:

```bash
ssh -i key.pem -L 5901:localhost:5900 ec2-user@<public-ip>
vncviewer -AlwaysCursor=1 localhost:5901
```

Login as `ec2-user` with the password you set.

## Disable Lock Screen and Password Requirement

To prevent the Mac from locking during unattended operation:

1. Open **System Settings → Lock Screen**
2. Set **"Start Screen Saver when inactive"** to **Never**
3. Set **"Turn display off when inactive"** to **Never**
4. Set **"Require password after screen saver begins or display is turned off"** to **Off**

---

# 2. OpenClaw Setup

Inside the macOS session (via VNC or SSH), install OpenClaw:

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

Alternatively, install via npm (requires Node 22+):

```bash
npm i -g openclaw
openclaw onboard
```

## Follow the Interactive Setup

1. Confirm and select **QuickStart** onboarding mode
2. Choose a model provider (Anthropic, OpenAI, local models, etc.) and enter your API key
3. Select a default model

## Connect a Communication Channel

OpenClaw supports 50+ channels including WhatsApp, Telegram, Discord, Slack, Signal, iMessage, and more. Choose whichever you prefer.

For example, to set up **Telegram**:

1. Open Telegram, message [@BotFather](https://t.me/BotFather)
2. Send `/newbot`, follow the prompts, copy the bot token
3. Paste it into the OpenClaw setup when prompted

## Complete Installation

- Skip skills and hooks for now
- Gateway service is installed as a LaunchAgent at `~/Library/LaunchAgents/ai.openclaw.gateway.plist`
- Logs at `~/.openclaw/logs/gateway.log`

## Access the Control UI

Create an SSH tunnel from your laptop:

```bash
ssh -i key.pem -N -L 18789:127.0.0.1:18789 ec2-user@<public-ip>
```

Then open `http://localhost:18789/` in your browser. Retrieve the gateway token with:

```bash
openclaw config get gateway.auth.token
```

---

## Next Steps

Your OpenClaw instance is ready. Return to the [main README](README.md) to set up VideoDB monitoring.
