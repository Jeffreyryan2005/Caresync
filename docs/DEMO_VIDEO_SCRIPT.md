# 🎬 3-Minute Demo Video Script: Alexa+ CareSync
> **Time Limit:** Under 3:00 minutes (Per Devpost Hackathon Rules)  
> **Target Track:** Alexa+ Track & AWS Builder Challenge

---

## ⏱️ Video Timeline Breakdown

| Timestamp | Section | Visual on Screen | Spoken Audio / Narration |
| :--- | :--- | :--- | :--- |
| **0:00 - 0:25** | **The Hook & Problem** | Pitch slide / webcam intro showing aging-in-place statistics & living room Echo Show display. | *"Over 54 million seniors age in place alone. When acute emergencies happen, reaching for a phone and unlocking the door for paramedics can take critical minutes that families don't have. What if Alexa+ didn't just answer questions, but acted as an autonomous ambient care guardian? Meet **Alexa+ CareSync**."* |
| **0:25 - 0:50** | **System Architecture & MCP** | Split-screen showing Echo Show UI and the Developer MCP Inspector. | *"Built for the Alexa+ Track and AWS Builder Challenge, CareSync runs on a self-hosted Model Context Protocol (MCP) server adhering to open MCP standards over Streamable HTTP and SSE, powered by the Amazon Bedrock Converse API with Claude 3.5 Sonnet."* |
| **0:50 - 1:35** | **Demo 1: The Emergency Triage & Paramedic Unlock** | Click or speak: *"Alexa, I have sudden chest tightness and I feel dizzy."* | *"Watch what happens during an acute distress call. The reactive Alexa+ orb instantly flashes crimson red. Behind the scenes, Bedrock invokes our MCP tool `triage_health_symptoms`, computes a Critical Severity score, and invokes `trigger_emergency_escalation`. Notice the smart home: the Ring front door lock automatically unlocks for first responders, and emergency pathway lights turn on bright amber. Family caregiver David Vance receives an instant alert with Eleanor's vitals."* |
| **1:35 - 2:05** | **Demo 2: Medication Adherence & Telemetry** | Click: *"Alexa, did I take my evening Metformin pill?"* | *"Next, ambient daily care. When asked about medication, Bedrock queries our `verify_medication` MCP tool, inspects Eleanor's prescription schedule, and updates the dynamic APL checklist. Notice the live vitals widget streaming real-time heart rate, blood pressure, and blood glucose."* |
| **2:05 - 2:35** | **Demo 3: Judge MCP Inspector & AWS Bedrock Telemetry** | Open the **Judge Inspector** side panel. | *"For hackathon judges and developers, our built-in Inspector exposes the live JSON-RPC 2.0 communication packets, Server-Sent Events, token usage, and sub-200ms latency. The system features a hybrid architecture: connecting directly to live AWS Bedrock if keys are provided, or running zero-config intelligent neural fallback for instant testing."* |
| **2:35 - 2:58** | **Conclusion & Vision** | Full Echo Show view with ambient glowing cyan orb. | *"Alexa+ CareSync transforms smart speakers from passive voice gadgets into proactive life-saving guardians. With MCP and AWS Bedrock, this is the future of living room ambient healthcare. Thank you!"* |

---

## 💡 Quick Tips for Recording:
1. **Screen Resolution:** Record in 1080p (1920x1080) in your browser at `http://localhost:5173`.
2. **Audio:** Ensure microphone is clear and computer audio is enabled so the Alexa voice synthesis speaks clearly in the recording.
3. **Pacing:** Follow the timestamps closely to stay well under the 3-minute hard ceiling.
