# CareSync: Ambient Health & Home Access Agent

> A reference implementation of a self-hosted **Model Context Protocol (MCP)** server and **Amazon Bedrock Converse API** multi-agent system, deployed on an authentic Echo Show 15 dashboard for clinical symptom triage, Ring physical access control, and continuous physiological telemetry.

Built for the **Build, Ship, Shape: Amazon Developer Hackathon (2026)**.  
- **Primary Track:** Alexa+ (Self-Hosted MCP Server on the open MCP standard)  
- **Mini-Challenge:** AWS Builder Challenge (Amazon Bedrock Multi-Agent Tool Calling)  
- **License:** MIT Open Source  

---

## Architecture Overview

```
                            +-------------------------------+
                            |     Echo Show 15 Display      |
                            |    React 19 + Tailwind CSS    |
                            +---------------+---------------+
                                            |
                Voice Input (STT)           |  REST / SSE Stream
                Tactile Widgets             |  JSON-RPC 2.0
                                            v
                            +-------------------------------+
                            |       CareSync Gateway        |
                            |     Express.js (Port 3001)    |
                            +---------------+---------------+
                                            |
                  +-------------------------+-------------------------+
                  |                                                   |
                  v                                                   v
   +-----------------------------+                     +-----------------------------+
   |      MCP Server Core        |                     |    Amazon Bedrock Engine    |
   |   (JSON-RPC 2.0 Standard)   |                     |     Converse API Client     |
   +--------------+--------------+                     +--------------+--------------+
                  |                                                   |
   +--------------+--------------+                     +--------------+--------------+
   | Tools:                      |                     | Model:                      |
   | - triage_health_symptoms    |                     | Claude 3.5 Sonnet           |
   | - trigger_emergency_alert   |                     | (us-east-1)                 |
   | - verify_medication         |                     +-----------------------------+
   | - smart_home_control        |                                    |
   | - schedule_appointment     |                     +--------------+--------------+
   | - get_vitals_history        |                     | Dual-Mode Architecture:     |
   | Resources:                  |                     | - Live AWS Bedrock          |
   | - care://patients/profile   |                     | - Zero-Config Neural Engine |
   | - care://devices/status     |                     +-----------------------------+
   +-----------------------------+
```

---

## Core Technical Features

1. **Model Context Protocol (MCP) Server (`server/src/mcp/`):**
   - Strictly conforms to the official 2024-11-05 MCP specification.
   - Streamable HTTP endpoint (`POST /mcp`) using standard JSON-RPC 2.0 parsing.
   - Real-time Server-Sent Events stream (`GET /sse`) for instant state synchronization.
   - Exposes 6 production tools, 3 structured healthcare/device resources, and 2 clinical prompt templates.

2. **Amazon Bedrock Multi-Agent Brain (`server/src/bedrock/`):**
   - Integrates the AWS Bedrock Converse API (`ConverseCommand`) using Anthropic Claude 3.5 Sonnet.
   - Bidirectional schema translation from standard MCP JSON Schema to Bedrock `toolSpec` structures.
   - Dual-mode architecture: connects to live AWS Bedrock when IAM credentials exist, with a built-in deterministic fallback engine for frictionless local evaluation without API keys.

3. **Authentic Echo Show 15 Multimodal Interface (`client/src/`):**
   - Recreates the Amazon Echo Show 15 widget board layout: Ring Security, BLE Vitals Sparkline, Medication Regimen, and Voice Activity stream.
   - Authentic Amazon cyan ambient light bar at the bottom screen edge, reacting dynamically to voice states (Listening, Processing, Speaking, Emergency Alert).
   - Embedded Developer Protocol Console drawer providing real-time inspection of raw JSON-RPC 2.0 packets, token usage, and Converse execution latency.

---

## Quickstart

### Prerequisites
- Node.js (v18+) & npm

### Setup & Run
```bash
# Clone the repository
git clone https://github.com/<your-username>/alexa-caresync.git
cd alexa-caresync

# Start both backend MCP server (port 3001) and frontend client (port 5173)
npm run dev
```

Open your browser to:  
👉 **`http://localhost:5173`**

### Optional: Live AWS Bedrock Credentials
To use an active AWS Bedrock subscription rather than the built-in fallback engine, create `server/.env`:
```env
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0
```

---

## Verified Evaluation Scenarios

You can speak via the microphone button or click any of the verified utterances on the dashboard:

| Scenario | Spoken Input | Executed MCP Tools | Observable Physical System Action |
| :--- | :--- | :--- | :--- |
| **Emergency Triage** | *"I have acute chest tightness and shortness of breath"* | `triage_health_symptoms`<br/>`trigger_emergency_escalation` | Ring front door deadbolt unlocks immediately for first responders; emergency pathway lights flash; caregiver SMS alert dispatched. |
| **Medication Check** | *"Check my evening medication schedule"* | `verify_medication` | Validates Lisinopril/Metformin regimen against patient EHR; checks documented drug allergy flags. |
| **Vitals Stream** | *"Query current vitals and glucose sensor telemetry"* | `get_patient_vitals_history` | Pulls continuous BLE heart rate, blood pressure, SpO2, and fasting glucose metrics into dashboard sparklines. |
| **Access Control** | *"Secure front entrance and adjust ambient lighting"* | `smart_home_control` | Dispatches Ring lock command to `LOCKED`; calibrates ambient lighting to 45% warm white. |

---

## Protocol Verification (Developer Console)

Click **"Developer Protocol"** in the top navigation bar to open the telemetry drawer:
- **Packet Log:** Inspect raw JSON-RPC 2.0 frames (`initialize`, `tools/list`, `tools/call`, `resources/read`).
- **Tool Schemas:** View the active input schema specifications exposed to Amazon Bedrock.
- **Latency Benchmarks:** Observe sub-200ms tool-dispatch execution metrics.

---

## Submission Artifacts

- **Devpost Entry Guide:** [`docs/DEVPOST_FORM_ENTRY_GUIDE.md`](docs/DEVPOST_FORM_ENTRY_GUIDE.md)
- **Detailed Project Story:** [`docs/DEVPOST_SUBMISSION.md`](docs/DEVPOST_SUBMISSION.md)
- **3-Minute Demo Video Script:** [`docs/DEMO_VIDEO_SCRIPT.md`](docs/DEMO_VIDEO_SCRIPT.md)

---

## License

Distributed under the [MIT License](LICENSE).
