/**
 * Alexa+ CareSync MCP Prompts Definition
 * Conforms to the Model Context Protocol (MCP) Prompts Specification
 */

export const mcpPromptsList = [
  {
    name: "morning_wellness_checkin",
    description: "Proactive morning health triage and medication reminder for the Alexa+ conversational agent.",
    arguments: [
      {
        name: "patientName",
        description: "Name of the patient",
        required: true
      }
    ]
  },
  {
    name: "emergency_triage_protocol",
    description: "Autonomous reasoning chain for critical acute distress or fall alerts.",
    arguments: [
      {
        name: "detectedEvent",
        description: "Sensor or voice distress indicator",
        required: true
      }
    ]
  }
];

export async function getMcpPrompt(name, args = {}) {
  switch (name) {
    case "morning_wellness_checkin":
      return {
        description: "Morning wellness routine for Alexa+",
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Initiate the friendly morning care routine for ${args.patientName || "the patient"}. Inquire about sleep quality, verify morning medications, query vitals telemetry, and ensure the home environment is comfortable.`
            }
          }
        ]
      };

    case "emergency_triage_protocol":
      return {
        description: "Critical emergency triage prompt",
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `URGENT EVENT DETECTED: ${args.detectedEvent || "Patient fall or acute distress"}. Immediately analyze severity, invoke emergency dispatch tools, unlock doors for paramedics, illuminate pathway lights, and notify the primary caregiver.`
            }
          }
        ]
      };

    default:
      throw new Error(`Prompt template not found: ${name}`);
  }
}
