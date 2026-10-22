/**
 * Alexa+ CareSync MCP Resources Definition
 * Conforms to the Model Context Protocol (MCP) Resource Specification
 */
import { careState } from "./tools.js";

export const mcpResourcesList = [
  {
    uri: "care://patients/current/profile",
    name: "Current Patient Profile & Clinical History",
    description: "Read-only medical dossier, allergies, chronic conditions, and emergency contacts.",
    mimeType: "application/json"
  },
  {
    uri: "care://devices/smart-home/status",
    name: "Smart Home & Ring Ambient Status",
    description: "Real-time state of connected Ring cameras, smart door locks, and lighting.",
    mimeType: "application/json"
  },
  {
    uri: "care://vitals/live-telemetry",
    name: "Live Sensor Vitals Stream",
    description: "Continuous telemetry stream from connected pulse oximeter, blood pressure cuff, and CGM.",
    mimeType: "application/json"
  }
];

export async function readMcpResource(uri) {
  switch (uri) {
    case "care://patients/current/profile":
      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(careState.patient, null, 2)
          }
        ]
      };

    case "care://devices/smart-home/status":
      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(careState.smartHome, null, 2)
          }
        ]
      };

    case "care://vitals/live-telemetry":
      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify({
              vitals: careState.patient.vitals,
              activeIncidents: careState.activeIncidents,
              sensorHealth: "OPTIMAL_CONNECTED"
            }, null, 2)
          }
        ]
      };

    default:
      throw new Error(`Resource not found for URI: ${uri}`);
  }
}
