/**
 * Alexa+ CareSync MCP Tools Definition
 * Conforms to the Model Context Protocol (MCP) Tools Specification (JSON-RPC 2.0)
 */

export const mcpToolsList = [
  {
    name: "triage_health_symptoms",
    description: "Analyzes patient symptoms, physiological vitals, and historical health records to assess severity, recommend immediate actions, and determine if emergency services or telemedicine are required.",
    inputSchema: {
      type: "object",
      properties: {
        symptoms: {
          type: "array",
          items: { type: "string" },
          description: "List of reported symptoms (e.g., chest tightness, dizziness, high fever)"
        },
        duration: {
          type: "string",
          description: "Duration of symptoms (e.g., '30 minutes', '2 days')"
        },
        patientId: {
          type: "string",
          description: "Unique patient identifier",
          default: "patient_echo_01"
        }
      },
      required: ["symptoms"]
    }
  },
  {
    name: "verify_medication",
    description: "Validates medication schedule, dosages, drug-drug interaction warnings, and checks against the patient's electronic health record.",
    inputSchema: {
      type: "object",
      properties: {
        medicationName: {
          type: "string",
          description: "Name of the medication (e.g., 'Metformin 500mg', 'Lisinopril 10mg')"
        },
        timeOfDay: {
          type: "string",
          enum: ["morning", "afternoon", "evening", "bedtime"],
          description: "Scheduled intake window"
        },
        action: {
          type: "string",
          enum: ["check_status", "mark_taken", "verify_image"],
          default: "check_status",
          description: "Action to perform on the medication schedule"
        }
      },
      required: ["medicationName"]
    }
  },
  {
    name: "smart_home_control",
    description: "Interacts with ambient Ring and Alexa smart home devices (smart locks, ambient lighting, temperature control, security cameras, emergency pathway lights).",
    inputSchema: {
      type: "object",
      properties: {
        deviceType: {
          type: "string",
          enum: ["smart_lock", "ambient_lights", "thermostat", "ring_camera", "emergency_pathway"],
          description: "Target smart home subsystem"
        },
        action: {
          type: "string",
          enum: ["unlock", "lock", "set_temp", "turn_on", "turn_off", "activate_emergency_lighting", "request_live_feed"],
          description: "Command to execute"
        },
        params: {
          type: "object",
          description: "Optional parameters (e.g., target temperature, brightness, color)",
          default: {}
        }
      },
      required: ["deviceType", "action"]
    }
  },
  {
    name: "trigger_emergency_escalation",
    description: "Triggers emergency protocol: unlocks smart doors for paramedics, turns on emergency flashers, compiles clinical vitals summary, and alerts designated emergency family contacts.",
    inputSchema: {
      type: "object",
      properties: {
        urgencyLevel: {
          type: "string",
          enum: ["YELLOW_ALERT", "ORANGE_ELEVATED", "RED_CRITICAL"],
          description: "Severity level of the emergency"
        },
        reason: {
          type: "string",
          description: "Clinical or sensor reason for emergency trigger (e.g., acute dyspnea, fall detected, severe tachycardia)"
        },
        notifyContacts: {
          type: "boolean",
          default: true,
          description: "Whether to dispatch SMS/Call notifications to primary family care circle"
        }
      },
      required: ["urgencyLevel", "reason"]
    }
  },
  {
    name: "schedule_care_appointment",
    description: "Schedules a telemedicine consultation with a physician or primary caregiver, syncing with the patient's Amazon Echo calendar.",
    inputSchema: {
      type: "object",
      properties: {
        specialty: {
          type: "string",
          description: "Doctor or specialist type (e.g., 'Cardiology', 'Primary Care Telehealth')"
        },
        preferredTime: {
          type: "string",
          description: "Preferred time window (e.g., 'Tomorrow morning at 10:00 AM')"
        },
        notes: {
          type: "string",
          description: "Clinical symptoms summary for the provider"
        }
      },
      required: ["specialty", "preferredTime"]
    }
  },
  {
    name: "get_patient_vitals_history",
    description: "Retrieves continuous IoT physiological telemetry (Heart Rate, Blood Pressure, SpO2, Blood Glucose) from connected wearables and ambient sensors.",
    inputSchema: {
      type: "object",
      properties: {
        metric: {
          type: "string",
          enum: ["all", "heart_rate", "blood_pressure", "oxygen_saturation", "blood_glucose"],
          default: "all",
          description: "Specific vital sign to retrieve"
        },
        timeRange: {
          type: "string",
          enum: ["latest", "past_24_hours", "past_week"],
          default: "latest",
          description: "Time horizon for sensor telemetry"
        }
      }
    }
  }
];

// In-Memory Care State for Live Interactive Demo
export const careState = {
  patient: {
    id: "patient_echo_01",
    name: "Eleanor Vance",
    age: 72,
    conditions: ["Hypertension", "Type 2 Diabetes"],
    allergies: ["Penicillin", "Sulfa drugs"],
    vitals: {
      heartRate: 78,
      bloodPressure: "128/82 mmHg",
      spo2: "98%",
      bloodGlucose: "110 mg/dL",
      lastUpdated: new Date().toLocaleTimeString()
    },
    emergencyContacts: [
      { name: "David Vance (Son)", phone: "+1 (555) 382-9901", relation: "Primary Caregiver" },
      { name: "Dr. Robert Chen", phone: "+1 (555) 902-1144", relation: "Primary Care Physician" }
    ],
    medications: [
      { id: "med_1", name: "Lisinopril 10mg", timeOfDay: "morning", taken: true, instructions: "Take with water after breakfast" },
      { id: "med_2", name: "Metformin 500mg", timeOfDay: "evening", taken: false, instructions: "Take with evening meal" },
      { id: "med_3", name: "Atorvastatin 20mg", timeOfDay: "bedtime", taken: false, instructions: "Take before sleep" }
    ]
  },
  smartHome: {
    frontDoorLocked: true,
    ambientLights: "Warm White (45%)",
    emergencyPathwayLights: false,
    thermostatTemp: 72,
    ringCameraStatus: "Armed & Ambient Monitoring"
  },
  activeIncidents: []
};

/**
 * MCP Tool Execution Router
 */
export async function executeMcpTool(name, args) {
  switch (name) {
    case "triage_health_symptoms": {
      const { symptoms = [], duration = "recently" } = args;
      const lower = symptoms.map(s => s.toLowerCase());
      
      const isCritical = lower.some(s => 
        s.includes("chest") || s.includes("breathe") || s.includes("breathing") || 
        s.includes("faint") || s.includes("collapse") || s.includes("stroke") || s.includes("numb")
      );

      const isModerate = lower.some(s =>
        s.includes("dizzy") || s.includes("fever") || s.includes("pain") || s.includes("nausea")
      );

      const triageResult = {
        severity: isCritical ? "CRITICAL_IMMEDIATE_ACTION" : isModerate ? "MODERATE_ATTENTION" : "MILD_MONITOR",
        summary: `Triage evaluation for symptoms: ${symptoms.join(", ")} (duration: ${duration}).`,
        clinicalScore: isCritical ? 9 : isModerate ? 5 : 2,
        recommendedAction: isCritical 
          ? "Initiate immediate emergency dispatch protocol, notify primary caregiver, unlock front door for responders."
          : isModerate
          ? "Rest in comfortable posture, monitor vitals, schedule same-day telehealth follow-up."
          : "Stay hydrated, log symptoms, take scheduled vitamins.",
        timestamp: new Date().toISOString()
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(triageResult, null, 2)
          }
        ]
      };
    }

    case "verify_medication": {
      const { medicationName, timeOfDay = "morning", action = "check_status" } = args;
      const med = careState.patient.medications.find(m => 
        m.name.toLowerCase().includes(medicationName.toLowerCase()) || 
        medicationName.toLowerCase().includes(m.name.toLowerCase())
      );

      if (action === "mark_taken" && med) {
        med.taken = true;
      }

      const result = {
        found: !!med,
        medication: med || { name: medicationName, status: "Not in active record" },
        currentSchedule: careState.patient.medications,
        interactionWarning: medicationName.toLowerCase().includes("penicillin") 
          ? "ALLERGY WARNING: Patient has documented severe allergy to Penicillin!" 
          : "No known adverse drug interactions detected."
      };

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
      };
    }

    case "smart_home_control": {
      const { deviceType, action, params = {} } = args;
      let statusMessage = "";

      if (deviceType === "smart_lock") {
        careState.smartHome.frontDoorLocked = (action === "lock");
        statusMessage = `Front door smart lock has been set to ${action === 'unlock' ? 'UNLOCKED (access granted)' : 'LOCKED'}.`;
      } else if (deviceType === "emergency_pathway") {
        careState.smartHome.emergencyPathwayLights = (action === "activate_emergency_lighting" || action === "turn_on");
        statusMessage = `High-visibility emergency pathway illumination ${careState.smartHome.emergencyPathwayLights ? 'ACTIVATED' : 'DEACTIVATED'}.`;
      } else if (deviceType === "ambient_lights") {
        careState.smartHome.ambientLights = params.level || (action === "turn_on" ? "Bright (100%)" : "Soft Amber (30%)");
        statusMessage = `Ambient lighting adjusted to ${careState.smartHome.ambientLights}.`;
      } else if (deviceType === "thermostat") {
        careState.smartHome.thermostatTemp = params.temp || 71;
        statusMessage = `Thermostat calibrated to ${careState.smartHome.thermostatTemp}°F.`;
      } else {
        statusMessage = `Device ${deviceType} updated with action ${action}.`;
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "SUCCESS",
            deviceType,
            action,
            message: statusMessage,
            smartHomeState: careState.smartHome
          }, null, 2)
        }]
      };
    }

    case "trigger_emergency_escalation": {
      const { urgencyLevel, reason, notifyContacts = true } = args;
      // Unlock door and activate lights automatically
      careState.smartHome.frontDoorLocked = false;
      careState.smartHome.emergencyPathwayLights = true;

      const incident = {
        incidentId: `INC-${Date.now().toString().slice(-4)}`,
        urgencyLevel,
        reason,
        timestamp: new Date().toLocaleTimeString(),
        respondersDispatched: urgencyLevel === "RED_CRITICAL",
        doorUnlocked: true,
        pathwayIllumination: true,
        contactsNotified: notifyContacts ? careState.patient.emergencyContacts : []
      };

      careState.activeIncidents.unshift(incident);

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "EMERGENCY_DISPATCH_TRIGGERED",
            incident,
            dispatchInstructions: "Paramedic access code transmitted. Door unlocked. Blue/Red emergency visual markers active."
          }, null, 2)
        }]
      };
    }

    case "schedule_care_appointment": {
      const { specialty, preferredTime, notes = "" } = args;
      const appointment = {
        confirmationCode: `ALX-APPT-${Math.floor(1000 + Math.random() * 9000)}`,
        specialty,
        scheduledTime: preferredTime,
        status: "CONFIRMED",
        provider: "Amazon Clinic / One Medical Telehealth",
        patientNotes: notes
      };

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "SUCCESS",
            appointment,
            calendarEventAdded: true
          }, null, 2)
        }]
      };
    }

    case "get_patient_vitals_history": {
      const { metric = "all" } = args;
      careState.patient.vitals.lastUpdated = new Date().toLocaleTimeString();
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            patientId: careState.patient.id,
            vitals: careState.patient.vitals,
            metricRequested: metric,
            status: "NOMINAL"
          }, null, 2)
        }]
      };
    }

    default:
      throw new Error(`Unknown MCP Tool: ${name}`);
  }
}
